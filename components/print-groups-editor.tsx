"use client";

import { PRINT_GROUP_MAX, PRINT_GROUP_NAME_MAX } from "@eaimesa/shared";
import { CategoryChecklist } from "./category-checklist";
import type { CatalogCategory } from "../lib/types";

export type DraftPrintGroup = {
  key: string;
  name: string;
  categoryIds: string[];
};

export function PrintGroupsEditor({
  categories,
  groups,
  onChange,
}: {
  categories: CatalogCategory[];
  groups: DraftPrintGroup[];
  onChange: (next: DraftPrintGroup[]) => void;
}) {
  function patch(key: string, next: Partial<DraftPrintGroup>) {
    onChange(groups.map((g) => (g.key === key ? { ...g, ...next } : g)));
  }

  return (
    <div className="surface space-y-4 p-4">
      <div>
        <p className="font-medium">Grupos de impressão</p>
        <p className="mt-1 text-sm text-ink-soft">
          Uma térmica, várias vias. Cada grupo imprime e a impressora corta. Ex.: Cozinha (petiscos
          e pratos), depois Drinks, depois Bebidas. Vale no Kanban do dono e do garçom. No perfil
          Painel, ligue “Imprimir via grupos” na equipe.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem grupos: o pedido sai numa via só.</p>
      ) : null}
      <ul className="space-y-4">
        {groups.map((group, index) => (
          <li key={group.key} className="rounded-xl border border-line/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block min-w-[12rem] flex-1 text-sm">
                <span className="mb-1 block font-medium">Grupo {index + 1}</span>
                <input
                  value={group.name}
                  maxLength={PRINT_GROUP_NAME_MAX}
                  onChange={(e) => patch(group.key, { name: e.target.value })}
                  className="field"
                  placeholder="Ex.: Cozinha"
                  required={groups.length > 0}
                />
              </label>
              <button
                type="button"
                className="btn-ghost !py-1.5 text-sm text-chili"
                onClick={() => onChange(groups.filter((g) => g.key !== group.key))}
              >
                Remover
              </button>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium">Categorias</p>
              <CategoryChecklist
                categories={categories}
                selected={group.categoryIds}
                onChange={(ids) => patch(group.key, { categoryIds: ids })}
              />
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary !py-1.5 text-sm"
        disabled={groups.length >= PRINT_GROUP_MAX}
        onClick={() =>
          onChange([
            ...groups,
            {
              key:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `g-${Date.now()}-${groups.length}`,
              name: "",
              categoryIds: [],
            },
          ])
        }
      >
        Adicionar grupo
      </button>
    </div>
  );
}
