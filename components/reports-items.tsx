"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, apiBase } from "../lib/api";
import { planFeatureMessage } from "../lib/finance-labels";
import { FinanceBar } from "./finance-kpi";
import { useFinanceQuery } from "./finance-period";

type Item = { name: string; qty: number; revenueCents: number };
type Cat = { categoryId: string | null; name: string; qty: number; revenueCents: number };

export function ReportsItems() {
  const { qs } = useFinanceQuery();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [top, categories] = await Promise.all([
        api<{ items: Item[] }>(`/v1/owner/finance/top-items?limit=20&${qs}`),
        api<{ categories: Cat[] }>(`/v1/owner/reports/categories?${qs}`),
      ]);
      setItems(top.items);
      setCats(categories.categories);
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = `${apiBase()}/v1/owner/reports/export?kind=items&${qs}`;
  const itemMax = Math.max(1, ...items.map((i) => i.revenueCents));
  const catMax = Math.max(1, ...cats.map((c) => c.revenueCents));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Itens e categorias</h2>
          <p className="mt-1 text-sm text-ink-soft">O que saiu no período, sem cancelados.</p>
        </div>
        <a href={exportUrl} className="btn-secondary !py-2 text-sm">
          Exportar CSV
        </a>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="font-medium">Por categoria</p>
          {cats.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {cats.map((c) => (
                <li key={c.categoryId ?? "none"}>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {c.name}
                      <span className="ml-2 text-xs text-ink-soft">{c.qty}×</span>
                    </span>
                    <span className="tabular-nums">{formatBrlFromCents(c.revenueCents)}</span>
                  </div>
                  <FinanceBar value={c.revenueCents} max={catMax} />
                </li>
              ))}
            </ul>
          ) : !error ? (
            <p className="mt-2 text-sm text-ink-soft">Sem vendas no período.</p>
          ) : null}
        </div>
        <div className="surface p-5">
          <p className="font-medium">Mais vendidos</p>
          {items.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {items.map((it) => (
                <li key={it.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{it.qty}×</span> {it.name}
                    </span>
                    <span className="tabular-nums">{formatBrlFromCents(it.revenueCents)}</span>
                  </div>
                  <FinanceBar value={it.revenueCents} max={itemMax} />
                </li>
              ))}
            </ul>
          ) : !error ? (
            <p className="mt-2 text-sm text-ink-soft">Sem itens no período.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
