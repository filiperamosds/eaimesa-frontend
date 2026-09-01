"use client";

import { formatBrlFromCents, ORDER_STATUS_LABEL, type OrderStatus } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiBase } from "../lib/api";
import { planFeatureMessage, SOURCE_LABEL } from "../lib/finance-labels";
import { useFinanceQuery } from "./finance-period";

type Row = {
  id: string;
  createdAt: string;
  status: string;
  source: string;
  tableLabel: string | null;
  items: number;
  totalCents: number;
  cancelled: boolean;
};

type Payload = { orders: Row[]; page: number; perPage: number; total: number };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ReportsOrders() {
  const { qs } = useFinanceQuery();
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const extra = [
      status ? `status=${status}` : "",
      source ? `source=${source}` : "",
      `page=${page}`,
      "perPage=50",
    ]
      .filter(Boolean)
      .join("&");
    try {
      setData(await api<Payload>(`/v1/owner/reports/orders?${qs}&${extra}`));
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs, status, source, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = `${apiBase()}/v1/owner/reports/export?kind=orders&${qs}`;
  const last = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Pedidos</h2>
          <p className="mt-1 text-sm text-ink-soft">Histórico do período — não é a fila do Kanban.</p>
        </div>
        <a href={exportUrl} className="btn-secondary !py-2 text-sm">
          Exportar CSV
        </a>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          className="field !w-auto"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Todos os status</option>
          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="field !w-auto"
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
        >
          <option value="">Todas as origens</option>
          <option value="guest">Cliente (QR)</option>
          <option value="counter">Garçom</option>
        </select>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {!data && !error ? <p className="text-ink-soft">Carregando…</p> : null}
      {data ? (
        <>
          <p className="text-sm text-ink-soft">{data.total} pedido{data.total === 1 ? "" : "s"}</p>
          <div className="overflow-x-auto surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Mesa</th>
                  <th className="px-4 py-2 font-medium">Origem</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Itens</th>
                  <th className="px-4 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-ink-soft">
                      Nenhum pedido no período.
                    </td>
                  </tr>
                ) : (
                  data.orders.map((o) => (
                    <tr key={o.id} className={o.cancelled ? "opacity-60" : ""}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatWhen(o.createdAt)}</td>
                      <td className="px-4 py-2">{o.tableLabel || "—"}</td>
                      <td className="px-4 py-2">{SOURCE_LABEL[o.source] ?? o.source}</td>
                      <td className="px-4 py-2">
                        {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{o.items}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatBrlFromCents(o.totalCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.total > data.perPage ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={page <= 1}
                onClick={() => setPage((n) => Math.max(1, n - 1))}
              >
                Anterior
              </button>
              <span className="self-center text-sm text-ink-soft">
                {page}/{last}
              </span>
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={page >= last}
                onClick={() => setPage((n) => n + 1)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
