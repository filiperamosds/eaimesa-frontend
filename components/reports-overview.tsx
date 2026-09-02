"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { planFeatureMessage } from "../lib/finance-labels";
import { FinanceBar, FinanceKpi } from "./finance-kpi";
import { useFinanceQuery } from "./finance-period";

type Kpis = {
  orders: number;
  cancelled: number;
  cancelledCents: number;
  guestOrders: number;
  counterOrders: number;
  tabsWithBalance: number;
  balanceCents: number;
  courtesyCents: number;
  discountCents: number;
  occupancy: number;
};

type HourBucket = { hour: number; orders: number };

type Overview = {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  kpis: Kpis;
  previous: Kpis;
  byHour?: { hours: HourBucket[]; peakHour: number | null };
};

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`;
}

function deltaHint(curr: number, prev: number): string | undefined {
  if (curr === prev) return "igual ao período anterior";
  const sign = curr > prev ? "+" : "−";
  return `${sign}${Math.abs(curr - prev)} vs período anterior`;
}

export function ReportsOverview() {
  const { qs } = useFinanceQuery();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<Overview>(`/v1/owner/reports/overview?${qs}`));
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p className="text-sm text-chili">{error}</p>;
  if (!data) return <p className="text-ink-soft">Carregando…</p>;
  const k = data.kpis;
  const p = data.previous;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl">Operação</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pedidos, cancelados e saldo no período {data.range.from} a {data.range.to}. Comparado a{" "}
          {data.previousRange.from}–{data.previousRange.to}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FinanceKpi label="Pedidos" value={String(k.orders)} hint={deltaHint(k.orders, p.orders)} />
        <FinanceKpi
          label="Cancelados"
          value={`${k.cancelled}`}
          hint={`${formatBrlFromCents(k.cancelledCents)} · ${deltaHint(k.cancelled, p.cancelled) ?? ""}`}
        />
        <FinanceKpi label="Cliente (QR)" value={String(k.guestOrders)} hint={deltaHint(k.guestOrders, p.guestOrders)} />
        <FinanceKpi label="Garçom" value={String(k.counterOrders)} hint={deltaHint(k.counterOrders, p.counterOrders)} />
        <FinanceKpi label="Ocupações" value={String(k.occupancy)} hint={deltaHint(k.occupancy, p.occupancy)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FinanceKpi
          label="Comandas com saldo"
          value={String(k.tabsWithBalance)}
          hint={formatBrlFromCents(k.balanceCents)}
        />
        <FinanceKpi label="Cortesia" value={formatBrlFromCents(k.courtesyCents)} />
        <FinanceKpi label="Descontos" value={formatBrlFromCents(k.discountCents)} />
      </div>
      <PeakHours byHour={data.byHour} />
    </div>
  );
}

function PeakHours({ byHour }: { byHour?: { hours: HourBucket[]; peakHour: number | null } }) {
  const hours = byHour?.hours ?? [];
  const peakHour = byHour?.peakHour ?? null;
  const max = Math.max(1, ...hours.map((h) => h.orders));
  const active = hours.filter((h) => h.orders > 0);
  const peak = peakHour != null ? hours.find((h) => h.hour === peakHour) : undefined;

  return (
    <div className="surface p-5">
      <p className="font-medium">Pico do dia</p>
      <p className="mt-1 text-xs text-ink-soft">Pedidos não cancelados, horário de Brasília, no período.</p>
      {peak ? (
        <p className="mt-2 text-sm">
          Mais movimento às <span className="font-medium text-chili">{hourLabel(peak.hour)}</span>{" "}
          ({peak.orders} pedido{peak.orders === 1 ? "" : "s"}).
        </p>
      ) : null}
      {active.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {active.map((h) => (
            <li key={h.hour}>
              <div className="flex items-center justify-between text-sm">
                <span className={h.hour === peakHour ? "font-medium text-chili" : ""}>{hourLabel(h.hour)}</span>
                <span className="tabular-nums">{h.orders}</span>
              </div>
              <FinanceBar value={h.orders} max={max} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Nenhum pedido no período.</p>
      )}
    </div>
  );
}
