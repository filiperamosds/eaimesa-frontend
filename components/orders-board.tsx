"use client";

import {
  formatBrlFromCents,
  KANBAN_COLUMNS,
  ORDER_NEXT,
  ORDER_NEXT_LABEL,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@eaimesa/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffOrder } from "../lib/types";

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
}: {
  endpoints?: BoardEndpoints;
  compact?: boolean;
}) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ orders: StaffOrder[] }>(endpoints.list);
    setOrders(data.orders);
  }, [endpoints.list]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : "Falha ao carregar pedidos."));
    const t = setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<string, StaffOrder[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const o of orders) {
      map[o.status]?.push(o);
    }
    return map;
  }, [orders]);

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
            {compact
              ? "Aceite e avance os pedidos. Para lançar itens, abra a mesa em Mesas."
              : "Kanban do turno. Lançar pedido: abra a mesa em Mesas e comandas."}
          </p>
        </div>
        <Link href="/garcom" className="btn-secondary !py-2 text-sm">
          Mesas e comandas
        </Link>
      </div>
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
                  open={openId === order.id}
                  onToggle={() => setOpenId((cur) => (cur === order.id ? null : order.id))}
                  onAdvance={() => {
                    const next = ORDER_NEXT[order.status];
                    if (next) void setStatus(order.id, next);
                  }}
                  onCancel={() => void setStatus(order.id, "cancelled")}
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
  open,
  onToggle,
  onAdvance,
  onCancel,
}: {
  order: StaffOrder;
  open: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  onCancel: () => void;
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
        {order.status !== "delivered" ? (
          <button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-xs text-chili">
            Cancelar
          </button>
        ) : null}
      </div>
    </li>
  );
}
