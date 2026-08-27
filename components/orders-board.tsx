"use client";

import {
  filterOrdersByCategories,
  formatBrlFromCents,
  KANBAN_COLUMNS,
  ORDER_NEXT,
  ORDER_NEXT_LABEL,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@eaimesa/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { connectThermalPrinter, hasGrantedThermalPrinter, printEscPosOrder } from "../lib/print-escpos";
import type { StaffOrder } from "../lib/types";

const AUTO_PRINT_KEY = "eaimesa.kanban.autoPrint";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

const COLUMN_DOT: Record<(typeof KANBAN_COLUMNS)[number], string> = {
  pending: "bg-chili",
  accepted: "bg-amber",
  preparing: "bg-sage",
  delivered: "bg-ink/30",
};

type BoardEndpoints = {
  list: string;
  patch: (id: string) => string;
};

const OWNER_ENDPOINTS: BoardEndpoints = {
  list: "/v1/owner/orders",
  patch: (id) => `/v1/owner/orders/${id}`,
};

export const STAFF_BOARD_ENDPOINTS: BoardEndpoints = {
  list: "/v1/staff/orders",
  patch: (id) => `/v1/staff/orders/${id}`,
};

export function OrdersBoard({
  endpoints = OWNER_ENDPOINTS,
  compact = false,
  station = false,
  categoryIds,
}: {
  endpoints?: BoardEndpoints;
  compact?: boolean;
  /** Monitor de cozinha/bar: só Kanban, sem atalho para mesas. */
  station?: boolean;
  categoryIds?: string[];
}) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fMesa, setFMesa] = useState("");
  const [fNome, setFNome] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const primedRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const autoPrintRef = useRef(false);
  const printChain = useRef(Promise.resolve());

  autoPrintRef.current = autoPrint;

  const load = useCallback(async () => {
    const data = await api<{ orders: StaffOrder[] }>(endpoints.list);
    const incoming = station ? filterOrdersByCategories(data.orders, categoryIds) : data.orders;
    if (!primedRef.current) {
      for (const o of incoming) seenRef.current.add(o.id);
      primedRef.current = true;
      setOrders(data.orders);
      return;
    }
    const fresh = incoming.filter((o) => o.status === "pending" && !seenRef.current.has(o.id));
    for (const o of incoming) seenRef.current.add(o.id);
    setOrders(data.orders);
    if (!autoPrintRef.current) return;
    for (const order of fresh) {
      printChain.current = printChain.current
        .then(() => printEscPosOrder(order, false))
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Falha ao imprimir na térmica.");
        });
    }
  }, [endpoints.list, station, categoryIds]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : "Falha ao carregar pedidos."));
    const t = setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(AUTO_PRINT_KEY) !== "1") return;
    void hasGrantedThermalPrinter().then((ok) => {
      if (ok) setAutoPrint(true);
      else sessionStorage.removeItem(AUTO_PRINT_KEY);
    });
  }, []);

  const visible = useMemo(
    () => (station ? filterOrdersByCategories(orders, categoryIds) : orders),
    [orders, station, categoryIds],
  );

  const filtered = useMemo(() => {
    const mesa = fMesa.trim().toLowerCase();
    const nome = fNome.trim().toLowerCase();
    if (!mesa && !nome) return visible;
    return visible.filter((o) => {
      const mesaOk = !mesa || (o.tableLabel ?? "").toLowerCase().includes(mesa);
      const nomeOk = !nome || (o.guestName ?? "").toLowerCase().includes(nome);
      return mesaOk && nomeOk;
    });
  }, [visible, fMesa, fNome]);

  const byStatus = useMemo(() => {
    const map: Record<string, StaffOrder[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const o of filtered) {
      map[o.status]?.push(o);
    }
    return map;
  }, [filtered]);

  async function toggleAutoPrint() {
    setError(null);
    if (autoPrint) {
      setAutoPrint(false);
      sessionStorage.removeItem(AUTO_PRINT_KEY);
      return;
    }
    try {
      await connectThermalPrinter();
      setAutoPrint(true);
      sessionStorage.setItem(AUTO_PRINT_KEY, "1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conectar a térmica.");
    }
  }

  async function printOrder(order: StaffOrder) {
    setError(null);
    setPrintingId(order.id);
    try {
      await printEscPosOrder(order, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível imprimir na térmica.");
    } finally {
      setPrintingId(null);
    }
  }

  async function setStatus(id: string, status: OrderStatus) {
    setError(null);
    try {
      const updated = await api<StaffOrder>(endpoints.patch(id), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((cur) => {
        if (status === "cancelled") return cur.filter((o) => o.id !== id);
        return cur.map((o) => (o.id === id ? updated : o));
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Turno</p>
          <h1 className={`mt-2 font-serif ${compact ? "text-2xl" : "text-3xl"}`}>Pedidos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {station
              ? "Somente itens das categorias deste monitor. Avance o status quando a estação terminar."
              : compact
                ? "Aceite e avance os pedidos. Para lançar itens, abra a mesa em Mesas."
                : "Kanban do turno. Lançar pedido: abra a mesa em Mesas e comandas."}{" "}
            {autoPrint
              ? "Pedidos novos saem na POS80 sem a caixa do Chrome."
              : "Ligue a térmica uma vez para imprimir os novos direto."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {compact && !station ? (
            <Link href="/garcom" className="btn-secondary !py-2 text-sm">
              Mesas e comandas
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleAutoPrint()}
            className={autoPrint ? "btn-primary !py-2 text-sm" : "btn-secondary !py-2 text-sm"}
          >
            {autoPrint ? "Imprimindo novos" : "Imprimir novos na térmica"}
          </button>
        </div>
      </div>
      {station ? null : (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="field max-w-[12rem]"
            placeholder="Filtrar por mesa"
            value={fMesa}
            onChange={(e) => setFMesa(e.target.value)}
            aria-label="Filtrar por mesa"
          />
          <input
            className="field max-w-[14rem]"
            placeholder="Filtrar por comanda (nome)"
            value={fNome}
            onChange={(e) => setFNome(e.target.value)}
            aria-label="Filtrar por nome de comanda"
          />
          {fMesa || fNome ? (
            <button
              type="button"
              onClick={() => {
                setFMesa("");
                setFNome("");
              }}
              className="btn-ghost !py-2 text-sm"
            >
              Limpar
            </button>
          ) : null}
        </div>
      )}
      {error ? <p className="mb-3 text-sm text-chili">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <section key={col} className="flex w-[min(100%,18rem)] shrink-0 flex-col rounded-2xl bg-paper-2/70">
            <header className="flex items-center justify-between px-3 py-3">
              <h2 className="flex items-center gap-2 font-serif text-lg">
                <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[col]}`} aria-hidden />
                {ORDER_STATUS_LABEL[col]}
              </h2>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs text-ink-soft">
                {byStatus[col]?.length ?? 0}
              </span>
            </header>
            <ul className="flex min-h-[12rem] flex-1 flex-col gap-2 px-2 pb-3">
              {(byStatus[col] ?? []).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  station={station}
                  open={openId === order.id}
                  onToggle={() => setOpenId((cur) => (cur === order.id ? null : order.id))}
                  onAdvance={() => {
                    const next = ORDER_NEXT[order.status];
                    if (next) void setStatus(order.id, next);
                  }}
                  onCancel={() => void setStatus(order.id, "cancelled")}
                  printing={printingId === order.id}
                  onPrint={() => void printOrder(order)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  station,
  open,
  onToggle,
  onAdvance,
  onCancel,
  printing,
  onPrint,
}: {
  order: StaffOrder;
  station: boolean;
  open: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  printing: boolean;
  onPrint: () => void;
}) {
  const nextLabel = ORDER_NEXT_LABEL[order.status];
  return (
    <li className="surface p-3 shadow-none">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">
            {order.tableLabel}
            {order.guestName ? ` · ${order.guestName}` : ""}
          </span>
          <span className="text-xs text-ink-soft">{timeAgo(order.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-soft">
          {order.source === "guest" ? "Cardápio" : "Balcão"}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
          {order.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
        </p>
        <p className="mt-1 text-sm tabular-nums">{formatBrlFromCents(order.totalCents)}</p>
      </button>
      {open ? (
        <div className="mt-2 border-t border-line pt-2 text-sm">
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.qty}× {i.name}
                  {i.note ? <span className="text-ink-soft"> — {i.note}</span> : null}
                </span>
                <span className="tabular-nums">
                  {formatBrlFromCents(i.unitPriceCents * i.qty)}
                </span>
              </li>
            ))}
          </ul>
          {order.note ? <p className="mt-2 text-ink-soft">{order.note}</p> : null}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {nextLabel ? (
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-full bg-sage px-3 py-1.5 text-xs font-medium text-white"
          >
            {nextLabel}
          </button>
        ) : null}
        {order.status !== "delivered" && !station ? (
          <button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-xs text-chili">
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrint}
          disabled={printing}
          className="rounded-full px-3 py-1 text-xs text-ink-soft disabled:opacity-50"
        >
          {printing ? "Enviando…" : "Imprimir"}
        </button>
      </div>
    </li>
  );
}
