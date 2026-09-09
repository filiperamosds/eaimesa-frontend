"use client";

import { groupedModifierLabels, type OrderItemModifier } from "@eaimesa/shared";

export function OrderItemExtras({
  modifiers,
  className = "block text-xs text-ink-soft",
}: {
  modifiers?: OrderItemModifier[] | null;
  className?: string;
}) {
  const lines = groupedModifierLabels(modifiers);
  if (lines.length === 0) return null;
  return <span className={className}>{lines.join(" · ")}</span>;
}
