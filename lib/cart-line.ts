import {
  cartLineKey,
  extraCentsFromOptions,
  pickerGroups,
  snapshotFromPicks,
  type ModifierGroup,
  type OrderItemModifier,
} from "@eaimesa/shared";

export type CartLine = {
  key: string;
  catalogItemId: string;
  name: string;
  priceCents: number;
  qty: number;
  note: string;
  maxNoteLength: number;
  modifierOptionIds?: string[];
  modifiers?: OrderItemModifier[];
};

export function makeCartLine(
  item: {
    id: string;
    name: string;
    priceCents: number;
    maxNoteLength?: number;
    modifierGroups?: ModifierGroup[];
  },
  optionIds: string[] = [],
  qty = 1,
): CartLine {
  const groups = pickerGroups(item.modifierGroups);
  return {
    key: cartLineKey(item.id, optionIds),
    catalogItemId: item.id,
    name: item.name,
    priceCents: item.priceCents + extraCentsFromOptions(groups, optionIds),
    qty,
    note: "",
    maxNoteLength: item.maxNoteLength ?? 80,
    modifierOptionIds: optionIds,
    modifiers: snapshotFromPicks(groups, optionIds),
  };
}

export function upsertCartLine(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = cart.find((l) => l.key === line.key);
  if (existing) {
    return cart.map((l) =>
      l.key === line.key ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l,
    );
  }
  return [...cart, line];
}

export function qtyOfItem(cart: CartLine[], catalogItemId: string): number {
  return cart.filter((l) => l.catalogItemId === catalogItemId).reduce((s, l) => s + l.qty, 0);
}
