"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, CatalogItem, StaffOrder } from "../lib/types";

type Props = {
  tableId: string;
  tableLabel: string;
  tabId: string;
  guestName: string;
  onClose: () => void;
  onCreated: (order: StaffOrder) => void;
};

function activeCatalog(categories: CatalogCategory[]) {
  return categories
    .filter((c) => c.active)
    .map((c) => ({ ...c, items: c.items.filter((i) => i.active) }))
    .filter((c) => c.items.length > 0);
}

export function StaffAddOrderDialog({ tableId, tableLabel, tabId, guestName, onClose, onCreated }: Props) {
  const [catalog, setCatalog] = useState<CatalogCategory[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ categories: CatalogCategory[] }>("/v1/staff/catalog")
      .then((d) => setCatalog(activeCatalog(d.categories)))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o cardápio.");
        setCatalog([]);
      });
  }, []);

  const groups = catalog ?? [];
  const selected = groups.find((c) => c.id === categoryId) ?? null;
  const itemsById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const cat of groups) {
      for (const item of cat.items) map.set(item.id, item);
    }
    return map;
  }, [groups]);

  const lines = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => {
          const item = itemsById.get(id);
          return item ? { item, qty: n } : null;
        })
        .filter((l): l is { item: CatalogItem; qty: number } => l !== null),
    [qty, itemsById],
  );
  const totalCents = lines.reduce((s, l) => s + l.item.priceCents * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function setItemQty(id: string, next: number) {
    const n = Math.max(0, Math.min(99, next));
    setQty((cur) => {
      if (n === 0) {
        const next = { ...cur };
        delete next[id];
        return next;
      }
      return { ...cur, [id]: n };
    });
  }

  async function submit() {
    if (lines.length === 0) {
      setError("Escolha pelo menos um item.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const order = await api<StaffOrder>("/v1/staff/orders", {
        method: "POST",
        body: JSON.stringify({
          tabId,
          tableId,
          note: note.trim() || null,
          items: lines.map((l) => ({ catalogItemId: l.item.id, qty: l.qty })),
        }),
      });
      onCreated(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível lançar o pedido.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-add-order-title"
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="eyebrow">{tableLabel}</p>
        <h2 id="staff-add-order-title" className="mt-2 font-serif text-2xl">
          Pedido de {guestName}
        </h2>
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}

        {catalog === null ? (
          <p className="py-10 text-center text-ink-soft">Carregando cardápio…</p>
        ) : groups.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">Nenhum item ativo no cardápio.</p>
        ) : !selected ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <p className="text-sm text-ink-soft">Escolha a categoria</p>
            {count > 0 ? (
              <p className="mt-2 text-sm">
                <span className="font-medium">
                  {count} {count === 1 ? "item" : "itens"}
                </span>
                <span className="ml-2 tabular-nums text-chili">{formatBrlFromCents(totalCents)}</span>
                <span className="text-ink-soft"> na cesta — abra outra categoria ou lance o pedido.</span>
              </p>
            ) : null}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {groups.map((cat) => {
                const inCat = cat.items.reduce((s, i) => s + (qty[i.id] ?? 0), 0);
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className="flex w-full flex-col rounded-2xl border border-line bg-card px-4 py-4 text-left hover:border-chili/40"
                    >
                      <span className="font-serif text-lg">{cat.name}</span>
                      <span className="mt-1 text-xs text-ink-soft">
                        {cat.items.length} {cat.items.length === 1 ? "item" : "itens"}
                        {inCat > 0 ? (
                          <span className="ml-1.5 font-medium tabular-nums text-chili">· {inCat} na cesta</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <>
            <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className="btn-ghost !px-2 !py-1 text-sm"
              >
                ← Categorias
              </button>
              {count > 0 ? (
                <p className="text-sm">
                  <span className="font-medium tabular-nums">
                    {count} {count === 1 ? "item" : "itens"}
                  </span>
                  <span className="ml-2 tabular-nums text-chili">{formatBrlFromCents(totalCents)}</span>
                </p>
              ) : null}
            </div>
            <nav
              className="-mx-1 mt-3 shrink-0 overflow-x-auto border-b border-line pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Categorias"
            >
              <ul className="flex gap-2 px-1">
                {groups.map((cat) => {
                  const inCat = cat.items.reduce((s, i) => s + (qty[i.id] ?? 0), 0);
                  const on = cat.id === selected.id;
                  return (
                    <li key={cat.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={
                          on
                            ? "rounded-full bg-chili px-3 py-1.5 text-sm font-medium text-white"
                            : "rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink/30"
                        }
                      >
                        {cat.name}
                        {inCat > 0 ? (
                          <span className={`ml-1.5 tabular-nums ${on ? "text-white/80" : "text-chili"}`}>{inCat}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <ul className="mt-3 min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {selected.items.map((item) => {
                const n = qty[item.id] ?? 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="text-xs tabular-nums text-ink-soft">{formatBrlFromCents(item.priceCents)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Menos ${item.name}`}
                        disabled={n === 0}
                        onClick={() => setItemQty(item.id, n - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-lg leading-none disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{n}</span>
                      <button
                        type="button"
                        aria-label={`Mais ${item.name}`}
                        disabled={n >= 99}
                        onClick={() => setItemQty(item.id, n + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-chili text-lg leading-none text-white disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="mt-3 block shrink-0 text-sm">
              <span className="mb-1 block font-medium">Nota (opcional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={280}
                className="field"
                placeholder="Ex.: sem gelo"
              />
            </label>
          </>
        )}

        <div className="mt-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {!selected ? (
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
          ) : null}
          {selected || count > 0 ? (
            <button
              type="button"
              disabled={pending || lines.length === 0}
              onClick={() => void submit()}
              className="btn-primary !py-2 text-sm disabled:opacity-50"
            >
              {pending ? "Lançando…" : "Lançar pedido"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
