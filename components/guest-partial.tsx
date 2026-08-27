"use client";

import { formatBrlFromCents, GUEST_ORDER_STATUS_LABEL } from "@eaimesa/shared";
import type { GuestOrder } from "../lib/types";

export function GuestPartial({
  orders,
  totalCents,
  serviceFeePercent = 0,
  serviceFeeCents = 0,
  emptyLabel = "Nenhum pedido nesta comanda ainda.",
}: {
  orders: GuestOrder[];
  totalCents: number;
  serviceFeePercent?: number;
  serviceFeeCents?: number;
  emptyLabel?: string;
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyLabel}</p>;
  }

  const feeOn = serviceFeePercent > 0;
  const due = totalCents + (feeOn ? serviceFeeCents : 0);

  return (
    <div>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="border-b border-line pb-3 text-sm last:border-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {GUEST_ORDER_STATUS_LABEL[order.status]}
              </span>
              <span className="tabular-nums text-chili">{formatBrlFromCents(order.totalCents)}</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.qty}× {item.name}
                  {item.note ? <span className="text-ink-soft"> — {item.note}</span> : null}
                </li>
              ))}
            </ul>
            {order.note ? <p className="mt-1 text-ink-soft">{order.note}</p> : null}
          </li>
        ))}
      </ul>
      {feeOn ? (
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <p className="flex items-baseline justify-between">
            <span>Itens</span>
            <span className="tabular-nums">{formatBrlFromCents(totalCents)}</span>
          </p>
          <p className="flex items-baseline justify-between text-ink-soft">
            <span>Taxa de serviço ({serviceFeePercent}%)</span>
            <span className="tabular-nums">{formatBrlFromCents(serviceFeeCents)}</span>
          </p>
        </div>
      ) : null}
      <p
        className={`flex items-baseline justify-between text-sm font-medium ${feeOn ? "mt-2" : "mt-3 border-t border-line pt-3"}`}
      >
        <span>Parcial</span>
        <span className="tabular-nums text-chili">{formatBrlFromCents(due)}</span>
      </p>
      <p className="mt-1 text-xs text-ink-soft">Cancelados não entram no total. Peça a conta ao garçom.</p>
    </div>
  );
}
