"use client";

import {
  extraCentsFromOptions,
  formatBrlFromCents,
  modifierRuleLabel,
  pickerGroups,
  validateModifierPicks,
  type ModifierGroup,
} from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  priceCents: number;
  modifierGroups?: ModifierGroup[];
};

export function ItemModifiersDialog({
  item,
  initialOptionIds,
  confirmLabel = "Adicionar",
  onConfirm,
  onClose,
}: {
  item: Item;
  initialOptionIds?: string[];
  confirmLabel?: string;
  onConfirm: (optionIds: string[]) => void;
  onClose: () => void;
}) {
  const groups = useMemo(() => pickerGroups(item.modifierGroups), [item.modifierGroups]);
  const [selected, setSelected] = useState<string[]>(() => initialOptionIds ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const extra = extraCentsFromOptions(groups, selected);
  const total = item.priceCents + extra;

  function toggle(group: ModifierGroup, optionId: string) {
    setError(null);
    setSelected((cur) => {
      const inGroup = group.options.map((o) => o.id);
      const has = cur.includes(optionId);
      if (group.maxSelect <= 1) {
        const without = cur.filter((id) => !inGroup.includes(id));
        if (has && group.minSelect <= 0) return without;
        return [...without, optionId];
      }
      if (has) return cur.filter((id) => id !== optionId);
      const count = cur.filter((id) => inGroup.includes(id)).length;
      if (count >= group.maxSelect) {
        setError(`Em ${group.name}, escolha no máximo ${group.maxSelect}.`);
        return cur;
      }
      return [...cur, optionId];
    });
  }

  function confirm() {
    const msg = validateModifierPicks(groups, selected);
    if (msg) {
      setError(msg);
      return;
    }
    onConfirm(selected);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modifiers-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="eyebrow">Opções</p>
        <h2 id="item-modifiers-title" className="mt-2 font-serif text-2xl">
          {item.name}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {formatBrlFromCents(item.priceCents)}
          {extra > 0 ? ` · extras ${formatBrlFromCents(extra)}` : ""}
        </p>
        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-0.5">
          {groups.map((group) => {
            const picked = selected.filter((id) => group.options.some((o) => o.id === id));
            return (
              <section key={group.id}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="font-medium">{group.name}</h3>
                  <span className="text-xs text-ink-soft">{modifierRuleLabel(group.minSelect, group.maxSelect)}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.options.map((opt) => {
                    const on = selected.includes(opt.id);
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          onClick={() => toggle(group, opt.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${
                            on ? "border-chili bg-chili/5" : "border-line bg-card hover:border-ink/30"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-medium">{opt.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-soft">
                            {opt.priceCents > 0 ? `+ ${formatBrlFromCents(opt.priceCents)}` : "sem taxa"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {picked.length > 0 ? (
                  <p className="mt-1.5 text-xs text-ink-soft">
                    {picked.length} {picked.length === 1 ? "escolhido" : "escolhidos"}
                  </p>
                ) : null}
              </section>
            );
          })}
          {error ? <p className="text-sm text-chili">{error}</p> : null}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium tabular-nums text-chili">{formatBrlFromCents(total)}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost !py-2 text-sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary !py-2 text-sm" onClick={confirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
