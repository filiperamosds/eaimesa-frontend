"use client";

import { formatStockQty, stockUnitLabel, type RecipeLine, type StockItem } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

export function ItemRecipeEditor({
  catalogItemId,
  stockItems,
  lines,
  onSaved,
  onError,
}: {
  catalogItemId: string;
  stockItems: StockItem[];
  lines: RecipeLine[];
  onSaved: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [draft, setDraft] = useState<RecipeLine[]>(lines);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(lines.length > 0);

  useEffect(() => {
    setDraft(lines);
    if (lines.length > 0) setOpen(true);
  }, [lines]);

  const used = new Set(draft.map((l) => l.stockItemId));
  const available = stockItems.filter((s) => !used.has(s.id));

  async function save() {
    onError(null);
    setSaving(true);
    try {
      await api(`/v1/owner/catalog/items/${catalogItemId}/recipe`, {
        method: "PUT",
        body: JSON.stringify({
          lines: draft
            .filter((l) => l.stockItemId && l.qty > 0)
            .map((l) => ({ stockItemId: l.stockItemId, qty: l.qty })),
        }),
      });
      await onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar a receita.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-soft hover:text-ink"
      >
        Receita
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-xl bg-paper-2/80 p-3 text-sm">
      <p className="mb-2 font-medium">Receita (por 1 unidade)</p>
      {draft.length === 0 ? (
        <p className="mb-2 text-ink-soft">Nenhum insumo. O pedido não baixa estoque.</p>
      ) : null}
      <ul className="space-y-2">
        {draft.map((line, i) => {
          const stock = stockItems.find((s) => s.id === line.stockItemId);
          const unit = stock?.unit ?? line.unit ?? "g";
          return (
            <li key={`${line.stockItemId}-${i}`} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                {stock?.name ?? line.name ?? "Insumo"}
              </span>
              <input
                type="number"
                min={1}
                value={line.qty}
                onChange={(e) => {
                  const next = [...draft];
                  next[i] = { ...line, qty: Number(e.target.value) || 0 };
                  setDraft(next);
                }}
                className="field w-24 py-1"
              />
              <span className="w-10 text-ink-soft">{unit}</span>
              <button
                type="button"
                className="text-chili"
                onClick={() => setDraft(draft.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {available.length > 0 ? (
        <select
          className="field mt-2 py-1 text-sm"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            const stock = stockItems.find((s) => s.id === id);
            if (!stock) return;
            setDraft([...draft, { stockItemId: stock.id, name: stock.name, unit: stock.unit, qty: 100 }]);
          }}
        >
          <option value="">Adicionar insumo…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({stockUnitLabel(s.unit)})
            </option>
          ))}
        </select>
      ) : stockItems.length === 0 ? (
        <p className="mt-2 text-ink-soft">
          Cadastre insumos em{" "}
          <a href="/painel/estoque" className="text-chili underline">
            Estoque
          </a>
          .
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="text-sm font-medium text-sage">
          {saving ? "Salvando…" : "Salvar receita"}
        </button>
        {draft.length > 0 ? (
          <span className="text-xs text-ink-soft">
            {draft
              .filter((l) => l.qty > 0)
              .map((l) => `${formatStockQty(l.qty, l.unit ?? "g")} ${l.name ?? ""}`.trim())
              .join(" + ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
