"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiBase } from "../lib/api";
import { METHOD_LABEL, planFeatureMessage } from "../lib/finance-labels";
import { useFinanceQuery } from "./finance-period";

type Row = {
  id: string;
  settledAt: string;
  tableLabel: string | null;
  guestName: string | null;
  waiterName: string;
  subtotalCents: number;
  serviceFeeCents: number;
  discountCents: number;
  paidCents: number;
  balanceCents: number;
  payments: { method: string; amountCents: number }[];
};

type Payload = { tabs: Row[]; page: number; perPage: number; total: number };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ReportsTabs() {
  const { qs } = useFinanceQuery();
  const [hasBalance, setHasBalance] = useState(false);
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const extra = [
      hasBalance ? "hasBalance=1" : "",
      method ? `method=${method}` : "",
      `page=${page}`,
      "perPage=50",
    ]
      .filter(Boolean)
      .join("&");
    try {
      setData(await api<Payload>(`/v1/owner/reports/tabs?${qs}&${extra}`));
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs, hasBalance, method, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = `${apiBase()}/v1/owner/reports/export?kind=tabs&${qs}`;
  const last = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Comandas</h2>
          <p className="mt-1 text-sm text-ink-soft">Fechamentos do período, com saldo e formas de pagamento.</p>
        </div>
        <a href={exportUrl} className="btn-secondary !py-2 text-sm">
          Exportar CSV
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-chili"
            checked={hasBalance}
            onChange={(e) => {
              setPage(1);
              setHasBalance(e.target.checked);
            }}
          />
          Só com saldo
        </label>
        <select
          className="field !w-auto"
          value={method}
          onChange={(e) => {
            setPage(1);
            setMethod(e.target.value);
          }}
        >
          <option value="">Todas as formas</option>
          {Object.entries(METHOD_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {!data && !error ? <p className="text-ink-soft">Carregando…</p> : null}
      {data ? (
        <>
          <p className="text-sm text-ink-soft">{data.total} comanda{data.total === 1 ? "" : "s"}</p>
          <div className="overflow-x-auto surface">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Mesa</th>
                  <th className="px-4 py-2 font-medium">Conta</th>
                  <th className="px-4 py-2 font-medium">Garçom</th>
                  <th className="px-4 py-2 font-medium text-right">Pago</th>
                  <th className="px-4 py-2 font-medium text-right">Saldo</th>
                  <th className="px-4 py-2 font-medium">Formas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.tabs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-ink-soft">
                      Nenhuma comanda fechada no período.
                    </td>
                  </tr>
                ) : (
                  data.tabs.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatWhen(t.settledAt)}</td>
                      <td className="px-4 py-2">{t.tableLabel || "—"}</td>
                      <td className="px-4 py-2">{t.guestName || "—"}</td>
                      <td className="px-4 py-2">{t.waiterName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatBrlFromCents(t.paidCents)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {t.balanceCents > 0 ? (
                          <span className="text-chili">{formatBrlFromCents(t.balanceCents)}</span>
                        ) : (
                          formatBrlFromCents(0)
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-ink-soft">
                        {t.payments.map((p) => `${METHOD_LABEL[p.method] ?? p.method} ${formatBrlFromCents(p.amountCents)}`).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.total > data.perPage ? (
            <div className="flex gap-2">
              <button type="button" className="btn-ghost text-sm" disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>
                Anterior
              </button>
              <span className="self-center text-sm text-ink-soft">
                {page}/{last}
              </span>
              <button type="button" className="btn-ghost text-sm" disabled={page >= last} onClick={() => setPage((n) => n + 1)}>
                Próxima
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
