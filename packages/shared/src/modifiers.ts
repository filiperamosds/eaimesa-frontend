export type ModifierOption = {
  id: string;
  name: string;
  priceCents: number;
  sortOrder: number;
  active: boolean;
};

export type ModifierGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  active: boolean;
  options: ModifierOption[];
};

export type OrderItemModifier = {
  groupId?: string | null;
  groupName: string;
  optionId?: string | null;
  name: string;
  priceCents: number;
};

export function pickerGroups(groups: ModifierGroup[] | null | undefined): ModifierGroup[] {
  return (groups ?? [])
    .filter((g) => g.active !== false)
    .map((g) => ({
      ...g,
      options: g.options.filter((o) => o.active !== false),
    }))
    .filter((g) => g.options.length > 0);
}

export function itemNeedsModifierPicker(groups: ModifierGroup[] | null | undefined): boolean {
  return pickerGroups(groups).length > 0;
}

export function modifierRuleLabel(min: number, max: number): string {
  if (min <= 0) {
    return max === 1 ? "Opcional · escolha até 1" : `Opcional · escolha até ${max}`;
  }
  if (min === max) {
    return min === 1 ? "Obrigatório · escolha 1" : `Obrigatório · escolha ${min}`;
  }
  return `Obrigatório · escolha de ${min} a ${max}`;
}

export function validateModifierPicks(groups: ModifierGroup[], selectedIds: string[]): string | null {
  const selected = new Set(selectedIds);
  if (selected.size !== selectedIds.length) return "Há opções repetidas.";
  const allowed = new Set<string>();
  for (const g of groups) {
    for (const o of g.options) allowed.add(o.id);
  }
  for (const id of selectedIds) {
    if (!allowed.has(id)) return "Alguma opção não pertence a este item.";
  }
  for (const g of groups) {
    const n = g.options.filter((o) => selected.has(o.id)).length;
    if (n < g.minSelect) {
      return g.minSelect === g.maxSelect
        ? `Em ${g.name}, escolha ${g.minSelect}.`
        : `Em ${g.name}, escolha pelo menos ${g.minSelect}.`;
    }
    if (n > g.maxSelect) {
      return `Em ${g.name}, escolha no máximo ${g.maxSelect}.`;
    }
  }
  return null;
}

export function extraCentsFromOptions(groups: ModifierGroup[], selectedIds: string[]): number {
  const set = new Set(selectedIds);
  let sum = 0;
  for (const g of groups) {
    for (const o of g.options) {
      if (set.has(o.id)) sum += o.priceCents;
    }
  }
  return sum;
}

export function snapshotFromPicks(groups: ModifierGroup[], selectedIds: string[]): OrderItemModifier[] {
  const set = new Set(selectedIds);
  const rows: OrderItemModifier[] = [];
  for (const g of groups) {
    for (const o of g.options) {
      if (!set.has(o.id)) continue;
      rows.push({
        groupId: g.id,
        groupName: g.name,
        optionId: o.id,
        name: o.name,
        priceCents: o.priceCents,
      });
    }
  }
  return rows;
}

export function groupedModifierLabels(modifiers: { groupName?: string; name: string }[] | null | undefined): string[] {
  if (!modifiers?.length) return [];
  const map = new Map<string, string[]>();
  for (const m of modifiers) {
    const key = m.groupName?.trim() || "Adicionais";
    const list = map.get(key) ?? [];
    list.push(m.name);
    map.set(key, list);
  }
  return [...map.entries()].map(([g, names]) => `${g}: ${names.join(", ")}`);
}

export function modifierSummary(modifiers: OrderItemModifier[] | null | undefined): string {
  return groupedModifierLabels(modifiers).join(" · ");
}

export function cartLineKey(catalogItemId: string, optionIds: string[] = []): string {
  const ids = [...optionIds].sort();
  return ids.length === 0 ? catalogItemId : `${catalogItemId}:${ids.join(",")}`;
}
