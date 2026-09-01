"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { planFeatureMessage } from "../lib/finance-labels";
import { useFinanceQuery } from "./finance-period";

type Waiter = {
  waiterMemberId: string | null;
  name: string;
  serviceFeeCents: number;
  salesCents: number;
  tabs: number;
};

export function ReportsTeam() {
  const { qs } = useFinanceQuery();
  const [rows, setRows] = useState<Waiter[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api<{ byWaiter?: Waiter[] }>(`/v1/owner/finance/summary?groupBy=waiter&${qs}`);
      setRows(d.byWaiter ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl">Equipe</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Taxa de serviço de quem abriu a mesa. Não rateia entre a equipe.
        </p>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {!rows && !error ? <p className="text-ink-soft">Carregando…</p> : null}
      {rows ? (
        rows.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma taxa no período.</p>
        ) : (
          <ul className="surface divide-y divide-line">
            {rows.map((w) => (
              <li key={w.waiterMemberId ?? "none"} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{w.name}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {w.tabs} comanda{w.tabs === 1 ? "" : "s"} · consumo {formatBrlFromCents(w.salesCents)}
                  </span>
                </span>
                <span className="tabular-nums font-medium text-chili">{formatBrlFromCents(w.serviceFeeCents)}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
