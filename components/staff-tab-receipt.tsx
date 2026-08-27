"use client";

import { useState } from "react";
import { formatBrlFromCents, GUEST_ORDER_STATUS_LABEL } from "@eaimesa/shared";
import { printEscPosReceipt } from "../lib/print-escpos";
import { printSystemReceipt } from "../lib/print-thermal-receipt";
import type { StaffTableTab } from "../lib/types";

type Props = {
  venueName: string;
  tableLabel: string;
  tab: StaffTableTab;
  onClose: () => void;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function StaffTabReceipt({ venueName, tableLabel, tab, onClose }: Props) {
  const activeOrders = tab.orders.filter((o) => o.status !== "cancelled");
  const cancelled = tab.orders.filter((o) => o.status === "cancelled");
  const [printError, setPrintError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  async function printThermal() {
    setPrintError(null);
    setPrinting(true);
    try {
      await printEscPosReceipt(venueName, tableLabel, tab);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : "Não foi possível imprimir na térmica.");
    } finally {
      setPrinting(false);
    }
  }

  function printSystem() {
    setPrintError(null);
    printSystemReceipt(venueName, tableLabel, tab);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center print:static print:bg-transparent print:p-0 print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl print:max-h-none print:w-[80mm] print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 print:hidden">
          <p className="text-sm font-medium">Cupom para conferência</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-50"
              disabled={printing}
              onClick={() => void printThermal()}
            >
              {printing ? "Enviando…" : "Imprimir"}
            </button>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        <div className="receipt-print min-h-0 flex-1 overflow-y-auto px-5 py-6 font-mono text-[13px] leading-relaxed text-ink print:overflow-visible print:px-0 print:py-0">
          <header className="text-center">
            <p id="receipt-title" className="text-base font-bold uppercase tracking-wide">
              {venueName}
            </p>
            <p className="mt-1 text-ink-soft">Comprovante de conferência</p>
            <p className="mt-3 border-y border-dashed border-ink/30 py-2">
              {tableLabel} · {tab.guestName}
            </p>
            <p className="mt-2 text-xs text-ink-soft">{tab.guestPhoneMasked}</p>
            <p className="text-xs text-ink-soft">Aberta em {formatWhen(tab.createdAt)}</p>
          </header>

          {activeOrders.length === 0 ? (
            <p className="mt-6 text-center text-ink-soft">Nenhum item nesta comanda.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {activeOrders.map((order) => (
                <li key={order.id}>
                  <div className="flex justify-between gap-2 text-xs uppercase tracking-wide text-ink-soft">
                    <span>{GUEST_ORDER_STATUS_LABEL[order.status]}</span>
                    <span>{formatWhen(order.createdAt)}</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="min-w-0">
                          {item.qty}× {item.name}
                          {item.note ? <span className="block text-xs text-ink-soft">{item.note}</span> : null}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatBrlFromCents(item.unitPriceCents * item.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.note ? <p className="mt-1 text-xs text-ink-soft">Obs.: {order.note}</p> : null}
                  <p className="mt-1 text-right text-xs tabular-nums text-ink-soft">
                    Pedido {formatBrlFromCents(order.totalCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {cancelled.length > 0 ? (
            <div className="mt-4 border-t border-dashed border-ink/30 pt-3 text-xs text-ink-soft">
              <p className="font-medium">Cancelados (fora do total)</p>
              {cancelled.map((order) => (
                <p key={order.id} className="mt-1">
                  {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-6 border-t-2 border-ink pt-4">
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm font-bold uppercase tracking-wide">Total a receber</span>
              <span className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-chili print:text-ink">
                {formatBrlFromCents(tab.totalCents)}
              </span>
            </div>
            <p className="mt-3 text-center text-[11px] text-ink-soft">
              Documento de conferência — não é cupom fiscal.
            </p>
            <p className="mt-2 text-center text-[11px] text-ink-soft print:hidden">
              Use <b>Imprimir na térmica</b> (USB). O diálogo do Chrome manda A4/PostScript e a POS80 imprime código.
            </p>
          </div>
        </div>

        <div className="border-t border-line px-4 py-3 print:hidden">
          {printError ? <p className="mb-2 text-sm text-chili">{printError}</p> : null}
          <button
            type="button"
            className="btn-primary w-full !py-2.5 text-sm disabled:opacity-50"
            disabled={printing}
            onClick={() => void printThermal()}
          >
            {printing ? "Enviando para a térmica…" : "Imprimir na térmica"}
          </button>
          <button type="button" className="btn-ghost mt-2 w-full !py-2 text-sm" onClick={printSystem}>
            Impressora do sistema (laser / PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
