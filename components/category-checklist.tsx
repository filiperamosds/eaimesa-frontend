"use client";

import type { CatalogCategory } from "../lib/types";

export function CategoryChecklist({
  categories,
  selected,
  onChange,
  emptyHint = "Cadastre categorias no cardápio para escolher o que entra neste grupo.",
}: {
  categories: CatalogCategory[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyHint}</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {categories.map((cat) => {
        const checked = selected.includes(cat.id);
        return (
          <li key={cat.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-chili"
                checked={checked}
                onChange={() => {
                  onChange(checked ? selected.filter((id) => id !== cat.id) : [...selected, cat.id]);
                }}
              />
              <span>
                {cat.name}
                {cat.active ? null : <span className="text-ink-soft"> (oculta)</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
