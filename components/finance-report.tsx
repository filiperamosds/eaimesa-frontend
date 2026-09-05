"use client";

import { formatBrlFromCents, moduleLabel } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiBase } from "../lib/api";
import { METHOD_LABEL, planFeatureMessage } from "../lib/finance-labels";
import { FinanceBar, FinanceKpi } from "./finance-kpi";
import { useFinanceQuery } from "./finance-period";

type Summary = {
  range: { from: string; to: string };
  kpis: {
    grossCents: number;
    soldCents?: number;
    serviceFeeCents?: number;
    courtesyCents?: number;
    discountCents?: number;
    netCents?: number;
    settlements: number;
    avgTicketCents: number;
    items: number;
  };
  byMethod?: { method: string; amountCents: number; count: number }[];
  byWaiter?: {
    waiterMemberId: string | null;
    name: string;
    serviceFeeCents: number;
    salesCents: number;
    tabs: number;
  }[];
  byDay?: { day: string; amountCents: number; count: number }[];
  byTable?: { tableId: string | null; label: string | null; amountCents: number; count: number }[];
};

type TopItems = { items: { name: string; qty: number; revenueCents: number }[] };

export function FinanceReport() {
  const { qs } = useFinanceQuery();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [waiters, setWaiters] = useState<Summary | null>(null);
  const [days, setDays] = useState<Summary | null>(null);
  const [tables, setTables] = useState<Summary | null>(null);
  const [top, setTop] = useState<TopItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, w, d, tb, t] = await Promise.all([
        api<Summary>(`/v1/owner/finance/summary?groupBy=method&${qs}`),
        api<Summary>(`/v1/owner/finance/summary?groupBy=waiter&${qs}`),
        api<Summary>(`/v1/owner/finance/summary?groupBy=day&${qs}`),
        api<Summary>(`/v1/owner/finance/summary?groupBy=table&${qs}`),
        api<TopItems>(`/v1/owner/finance/top-items?limit=10&${qs}`),
      ]);
      setSummary(s);
      setWaiters(w);
      setDays(d);
      setTables(tb);
      setTop(t);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? planFeatureMessage(err.code, err.message)
          : "Falha ao carregar o financeiro.",
      );
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = `${apiBase()}/v1/owner/finance/export?${qs}`;
  const dayMax = Math.max(1, ...(days?.byDay ?? []).map((d) => d.amountCents));
  const tableMax = Math.max(1, ...(tables?.byTable ?? []).map((t) => t.amountCents));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Faturamento</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Recebimentos no fechamento e taxa de serviço de quem abriu a mesa.
          </p>
        </div>
        <a href={exportUrl} className="btn-secondary !py-2 text-sm">
          Exportar CSV
        </a>
      </div>

      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {loading && !summary ? <p className="text-ink-soft">Carregando…</p> : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FinanceKpi
              label="Vendido"
              value={formatBrlFromCents(summary.kpis.soldCents ?? summary.kpis.grossCents)}
              hint="Total devido das comandas fechadas no período"
            />
            <FinanceKpi
              label="Recebido"
              value={formatBrlFromCents(summary.kpis.grossCents)}
              hint="Pago no fechamento (inclui cortesia)"
            />
            <FinanceKpi
              label="Líquido"
              value={formatBrlFromCents(summary.kpis.netCents ?? 0)}
              hint="Recebido menos cortesia"
            />
            <FinanceKpi label="Cortesia" value={formatBrlFromCents(summary.kpis.courtesyCents ?? 0)} />
            <FinanceKpi
              label="Descontos"
              value={formatBrlFromCents(summary.kpis.discountCents ?? 0)}
              hint="Já saiu do valor devido; não está no recebido"
            />
            <FinanceKpi label="Taxa de serviço" value={formatBrlFromCents(summary.kpis.serviceFeeCents ?? 0)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FinanceKpi label="Comandas" value={String(summary.kpis.settlements)} />
            <FinanceKpi label="Ticket médio" value={formatBrlFromCents(summary.kpis.avgTicketCents)} />
            <FinanceKpi label="Itens vendidos" value={String(summary.kpis.items)} />
          </div>

          <div className="surface p-5">
            <p className="font-medium">Por dia</p>
            {days?.byDay && days.byDay.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {days.byDay.map((d) => (
                  <li key={d.day}>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {d.day}
                        <span className="ml-2 text-xs text-ink-soft">{d.count}×</span>
                      </span>
                      <span className="tabular-nums font-medium">{formatBrlFromCents(d.amountCents)}</span>
                    </div>
                    <FinanceBar value={d.amountCents} max={dayMax} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhum recebimento no período.</p>
            )}
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
            <p className="font-medium">Por mesa</p>
            {tables?.byTable && tables.byTable.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {tables.byTable.map((t) => (
                  <li key={t.tableId ?? "none"}>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {t.label || "Sem mesa"}
                        <span className="ml-2 text-xs text-ink-soft">{t.count} comanda{t.count === 1 ? "" : "s"}</span>
                      </span>
                      <span className="tabular-nums font-medium">{formatBrlFromCents(t.amountCents)}</span>
                    </div>
                    <FinanceBar value={t.amountCents} max={tableMax} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhuma mesa no período.</p>
            )}
          </div>

          <div className="surface p-5">
            <p className="font-medium">Taxa de serviço por funcionário</p>
            <p className="mt-1 text-xs text-ink-soft">
              Quem abriu a mesa recebe a taxa daquelas comandas. Não rateia entre a equipe.
            </p>
            {waiters?.byWaiter && waiters.byWaiter.length > 0 ? (
              <ul className="mt-3 divide-y divide-line">
                {waiters.byWaiter.map((w) => (
                  <li
                    key={w.waiterMemberId ?? "none"}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{w.name}</span>
                      <span className="ml-2 text-xs text-ink-soft">
                        {w.tabs} comanda{w.tabs === 1 ? "" : "s"} · consumo{" "}
                        {formatBrlFromCents(w.salesCents)}
                      </span>
                    </span>
                    <span className="tabular-nums font-medium text-chili">
                      {formatBrlFromCents(w.serviceFeeCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhuma taxa no período.</p>
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
            Módulo {moduleLabel("finance")} · período {summary.range.from} a {summary.range.to}
            {loading ? " · atualizando…" : ""}.
          </p>
        </>
      ) : null}
    </div>
  );
}
