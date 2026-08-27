"use client";

import { formatBrlFromCents, moduleLabel } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiBase } from "../lib/api";

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  courtesy: "Cortesia",
  other: "Outro",
};

type Summary = {
  range: { from: string; to: string };
  kpis: { grossCents: number; settlements: number; avgTicketCents: number; items: number };
  byMethod?: { method: string; amountCents: number; count: number }[];
};

type TopItems = { items: { name: string; qty: number; revenueCents: number }[] };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function FinanceReport() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [top, setTop] = useState<TopItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `from=${from}&to=${to}`;
      const [s, t] = await Promise.all([
        api<Summary>(`/v1/owner/finance/summary?groupBy=method&${qs}`),
        api<TopItems>(`/v1/owner/finance/top-items?limit=10&${qs}`),
      ]);
      setSummary(s);
      setTop(t);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "PLAN_FEATURE"
            ? "O módulo Financeiro não está no seu plano."
            : err.message
          : "Falha ao carregar o financeiro.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = `${apiBase()}/v1/owner/finance/export?from=${from}&to=${to}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Financeiro</p>
        <h1 className="mt-2 font-serif text-3xl">Faturamento</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Recebimentos registrados no fechamento das comandas. Sem comissão sobre o consumo.
        </p>
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">De</span>
          <input type="date" className="field" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Até</span>
          <input type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-primary !py-2 text-sm">
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
        <a href={exportUrl} className="btn-secondary !py-2 text-sm">
          Exportar CSV
        </a>
      </div>

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Recebido" value={formatBrlFromCents(summary.kpis.grossCents)} />
            <Kpi label="Comandas" value={String(summary.kpis.settlements)} />
            <Kpi label="Ticket médio" value={formatBrlFromCents(summary.kpis.avgTicketCents)} />
            <Kpi label="Itens vendidos" value={String(summary.kpis.items)} />
          </div>

          <div className="surface p-5">
            <p className="font-medium">Por forma de pagamento</p>
            {summary.byMethod && summary.byMethod.length > 0 ? (
              <ul className="mt-3 divide-y divide-line">
                {summary.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {METHOD_LABEL[m.method] ?? m.method}
                      <span className="ml-2 text-xs text-ink-soft">{m.count}×</span>
                    </span>
                    <span className="tabular-nums font-medium text-chili">{formatBrlFromCents(m.amountCents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhum recebimento no período.</p>
            )}
          </div>

          <div className="surface p-5">
            <p className="font-medium">Mais vendidos</p>
            {top && top.items.length > 0 ? (
              <ul className="mt-3 divide-y divide-line">
                {top.items.map((it) => (
                  <li key={it.name} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="font-medium">{it.qty}×</span> {it.name}
                    </span>
                    <span className="tabular-nums text-ink-soft">{formatBrlFromCents(it.revenueCents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Sem itens no período.</p>
            )}
          </div>

          <p className="text-xs text-ink-soft">
            Módulo {moduleLabel("finance")} · período {summary.range.from} a {summary.range.to}.
          </p>
        </>
      ) : !error ? (
        <p className="text-ink-soft">Carregando…</p>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
    </div>
  );
}
