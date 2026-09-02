"use client";

import { formatStockQty, stockUnitLabel, type RecipeLine, type StockItem } from "@eaimesa/shared";
import Link from "next/link";

export function ItemRecipeEditor({
  stockItems,
  lines,
  onChange,
}: {
  stockItems: StockItem[];
  lines: RecipeLine[];
  onChange: (lines: RecipeLine[]) => void;
}) {
  const used = new Set(lines.map((l) => l.stockItemId));
  const available = stockItems.filter((s) => !used.has(s.id));

  return (
    <div className="rounded-xl bg-paper-2/80 p-3 text-sm">
      <p className="mb-2 font-medium">Receita (por 1 unidade)</p>
      {lines.length === 0 ? (
        <p className="mb-2 text-ink-soft">Nenhum insumo. O pedido não baixa estoque.</p>
      ) : null}
      <ul className="space-y-2">
        {lines.map((line, i) => {
          const stock = stockItems.find((s) => s.id === line.stockItemId);
          const unit = stock?.unit ?? line.unit ?? "g";
          return (
            <li key={`${line.stockItemId}-${i}`} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">{stock?.name ?? line.name ?? "Insumo"}</span>
              <input
                type="number"
                min={1}
                value={line.qty}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = { ...line, qty: Number(e.target.value) || 0 };
                  onChange(next);
                }}
                className="field w-24 py-1"
              />
              <span className="w-10 text-ink-soft">{unit}</span>
              <button
                type="button"
                className="text-chili"
                onClick={() => onChange(lines.filter((_, j) => j !== i))}
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
            onChange([...lines, { stockItemId: stock.id, name: stock.name, unit: stock.unit, qty: 100 }]);
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
          <Link href="/painel/configuracoes/estoque" className="text-chili underline">
            Configurações → Estoque
          </Link>
          .
        </p>
      ) : null}
      {lines.some((l) => l.qty > 0) ? (
        <p className="mt-2 text-xs text-ink-soft">
          {lines
            .filter((l) => l.qty > 0)
            .map((l) => `${formatStockQty(l.qty, l.unit ?? "g")} ${l.name ?? ""}`.trim())
            .join(" + ")}
        </p>
      ) : null}
    </div>
  );
}
