"use client";

import { filterOrdersByCategories, isPanelMember } from "@eaimesa/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { hasGrantedThermalPrinter, printEscPosOrder, printEscPosReceipt } from "./print-escpos";
import { setThermalAutoPrintEnabled } from "./thermal-print-pref";
import type { Session, StaffOrder, TabReceiptPrintJob } from "./types";

type PrintGroup = { name: string; categoryIds: string[] };

/**
 * Auto-print da via de cozinha + drenagem da fila de cupom (`print_jobs`).
 * `kanban` lê `thermalAutoPrint`; `tables` lê `thermalAutoPrintTables`.
 */
export function useThermalAutoPrint({
  source,
  list,
  patch,
  station = false,
  categoryIds,
  poll = false,
  onPrinted,
  onError,
}: {
  source: "kanban" | "tables";
  list: string;
  patch: (id: string) => string;
  station?: boolean;
  categoryIds?: string[];
  /** StaffBoard: busca pedidos sozinho. Kanban já faz poll e chama `consumeOrders`. */
  poll?: boolean;
  onPrinted?: (order: StaffOrder) => void;
  onError?: (message: string) => void;
}) {
  const [autoPrint, setAutoPrint] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [printGroups, setPrintGroups] = useState<PrintGroup[]>([]);
  const autoPrintRef = useRef(false);
  const hasPrinterRef = useRef(false);
  const printChain = useRef(Promise.resolve());
  const printingRef = useRef(new Set<string>());
  const printGroupsRef = useRef(printGroups);
  const patchRef = useRef(patch);
  const onPrintedRef = useRef(onPrinted);
  const onErrorRef = useRef(onError);

  autoPrintRef.current = autoPrint;
  printGroupsRef.current = printGroups;
  patchRef.current = patch;
  onPrintedRef.current = onPrinted;
  onErrorRef.current = onError;

  const drainReceiptQueue = useCallback(() => {
    if (!hasPrinterRef.current) return;
    printChain.current = printChain.current
      .then(async () => {
        while (hasPrinterRef.current) {
          const data = await api<{ job: TabReceiptPrintJob | null }>("/v1/staff/print-jobs/next", {
            method: "POST",
          });
          const job = data?.job;
          if (!job) break;
          try {
            await printEscPosReceipt(job.venueName, job.tableLabel, job.tab, false);
            await api(`/v1/staff/print-jobs/${job.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "printed" }),
            });
          } catch (err) {
            await api(`/v1/staff/print-jobs/${job.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "failed" }),
            }).catch(() => undefined);
            throw err;
          }
        }
      })
      .catch((err) => {
        onErrorRef.current?.(
          err instanceof Error ? err.message : "Falha ao imprimir o cupom na térmica.",
        );
      });
  }, []);

  const enqueuePrint = useCallback((order: StaffOrder, requestDevice: boolean) => {
    if (printingRef.current.has(order.id)) return;
    printingRef.current.add(order.id);
    setPrintingId(order.id);
    printChain.current = printChain.current
      .then(async () => {
        await printEscPosOrder(order, requestDevice, printGroupsRef.current);
        const updated = await api<StaffOrder>(patchRef.current(order.id), {
          method: "PATCH",
          body: JSON.stringify({ printed: true }),
        });
        onPrintedRef.current?.({ ...order, printedAt: updated.printedAt });
      })
      .catch((err) => {
        onErrorRef.current?.(err instanceof Error ? err.message : "Falha ao imprimir na térmica.");
      })
      .finally(() => {
        printingRef.current.delete(order.id);
        setPrintingId((cur) => (cur === order.id ? null : cur));
      });
  }, []);

  const consumeOrders = useCallback(
    (orders: StaffOrder[]) => {
      if (!autoPrintRef.current) return;
      const incoming = station ? filterOrdersByCategories(orders, categoryIds) : orders;
      const fresh = incoming.filter(
        (o) => o.status === "pending" && !o.printedAt && !printingRef.current.has(o.id),
      );
      for (const order of fresh) {
        enqueuePrint(order, false);
      }
    },
    [station, categoryIds, enqueuePrint],
  );

  const loadPending = useCallback(async () => {
    const data = await api<{ orders: StaffOrder[] }>(list);
    consumeOrders(data.orders);
  }, [list, consumeOrders]);

  useEffect(() => {
    void api<Session>("/v1/auth/me")
      .then((session) => {
        const panel = isPanelMember(session);
        const viaGroups = !panel || session.member?.printViaGroups === true;
        setPrintGroups(viaGroups ? (session.venue.printGroups ?? []) : []);
        const flagOn =
          source === "tables"
            ? session.venue.thermalAutoPrintTables === true
            : session.venue.thermalAutoPrint === true;
        void hasGrantedThermalPrinter().then((ok) => {
          hasPrinterRef.current = ok;
          if (flagOn) {
            if (ok) setAutoPrint(true);
            else if (source === "kanban") setThermalAutoPrintEnabled(false);
          } else {
            setAutoPrint(false);
          }
          if (ok) drainReceiptQueue();
        });
      })
      .catch(() => setPrintGroups([]));
  }, [source, drainReceiptQueue]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (poll && autoPrintRef.current) {
        void loadPending().catch(() => undefined);
      }
      drainReceiptQueue();
    }, 5000);
    return () => window.clearInterval(t);
  }, [poll, loadPending, drainReceiptQueue]);

  useEffect(() => {
    if (!autoPrint || !poll) return;
    void loadPending().catch(() => undefined);
  }, [autoPrint, poll, loadPending]);

  return { autoPrint, enqueuePrint, consumeOrders, printingId, printGroups };
}
