"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, CatalogItem, HappyHourWindow } from "../lib/types";
import { MoneyField } from "./masked-fields";

const DAYS = [
  { d: 0, label: "Dom" },
  { d: 1, label: "Seg" },
  { d: 2, label: "Ter" },
  { d: 3, label: "Qua" },
  { d: 4, label: "Qui" },
  { d: 5, label: "Sex" },
  { d: 6, label: "Sáb" },
] as const;

function emptyWindow(): HappyHourWindow {
  return { name: "", days: [3, 4], startsAt: "17:00", endsAt: "21:00", items: [] };
}

export function HappyHourEditor({ categories }: { categories: CatalogCategory[] }) {
  const catalog = useMemo(
    () => categories.flatMap((c) => c.items.filter((i) => i.active)),
    [categories],
  );
  const byId = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    for (const i of catalog) m.set(i.id, i);
    return m;
  }, [catalog]);
  const [windows, setWindows] = useState<HappyHourWindow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    void api<{ windows: HappyHourWindow[] }>("/v1/owner/happy-hour")
      .then((d) =>
        setWindows(
          d.windows.map((w) => ({
            ...w,
            startsAt: w.startsAt.slice(0, 5),
            endsAt: w.endsAt.slice(0, 5),
          })),
        ),
      )
      .catch(() => setWindows([]));
  }, []);

  function patch(idx: number, next: Partial<HappyHourWindow>) {
    setWindows((cur) => cur.map((w, i) => (i === idx ? { ...w, ...next } : w)));
    setOk(false);
  }

  async function save() {
    setError(null);
    setOk(false);
    for (const w of windows) {
      if (w.days.length === 0 || w.items.length === 0) {
        setError("Cada horário precisa de pelo menos um dia e um item.");
        return;
      }
    }
    setSaving(true);
    try {
      const data = await api<{ windows: HappyHourWindow[] }>("/v1/owner/happy-hour", {
        method: "PUT",
        body: JSON.stringify({
          windows: windows.map((w) => ({
            name: w.name?.trim() || null,
            days: w.days,
            startsAt: w.startsAt,
            endsAt: w.endsAt,
            items: w.items,
          })),
        }),
      });
      setWindows(data.windows);
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o happy hour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h3 className="font-serif text-xl">Happy hour</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Faixas por dia da semana. No horário, o item sai pelo valor da promoção. Ex.: qua/qui 17h–21h,
        sex/sáb outro, domingo outro.
      </p>
      <ul className="mt-4 space-y-4">
        {windows.map((w, idx) => (
          <li key={w.id ?? `new-${idx}`} className="surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="field max-w-[12rem] !py-1.5 text-sm"
                placeholder="Nome (opcional)"
                value={w.name ?? ""}
                onChange={(e) => patch(idx, { name: e.target.value })}
              />
              <input
                type="time"
                className="field !w-auto !py-1.5 text-sm"
                value={w.startsAt}
                onChange={(e) => patch(idx, { startsAt: e.target.value })}
                aria-label="Início"
              />
              <span className="text-sm text-ink-soft">até</span>
              <input
                type="time"
                className="field !w-auto !py-1.5 text-sm"
                value={w.endsAt}
                onChange={(e) => patch(idx, { endsAt: e.target.value })}
                aria-label="Fim"
              />
              <button
                type="button"
                className="btn-ghost ml-auto !py-1 text-sm"
                onClick={() => setWindows((cur) => cur.filter((_, i) => i !== idx))}
              >
                Remover
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const on = w.days.includes(day.d);
                return (
                  <button
                    key={day.d}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      on ? "bg-chili text-white" : "bg-paper-2 text-ink-soft"
                    }`}
                    onClick={() =>
                      patch(idx, {
                        days: on ? w.days.filter((d) => d !== day.d) : [...w.days, day.d].sort(),
                      })
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 space-y-2">
              {w.items.map((line) => {
                const item = byId.get(line.catalogItemId);
                return (
                  <li key={line.catalogItemId} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{item?.name ?? line.catalogItemId}</span>
                    <MoneyField
                      cents={line.priceCents}
                      onCentsChange={(c) => {
                        if (c === null) return;
                        patch(idx, {
                          items: w.items.map((it) =>
                            it.catalogItemId === line.catalogItemId ? { ...it, priceCents: c } : it,
                          ),
                        });
                      }}
                      className="field !w-28 !py-1 text-sm"
                      aria-label="Preço no happy hour"
                    />
                    <button
                      type="button"
                      className="text-xs text-ink-soft hover:text-chili"
                      onClick={() =>
                        patch(idx, { items: w.items.filter((it) => it.catalogItemId !== line.catalogItemId) })
                      }
                    >
                      tirar
                    </button>
                  </li>
                );
              })}
            </ul>
            <select
              className="field mt-2 !py-1.5 text-sm"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id || w.items.some((it) => it.catalogItemId === id)) return;
                const item = byId.get(id);
                patch(idx, {
                  items: [...w.items, { catalogItemId: id, priceCents: item?.priceCents ?? 0 }],
                });
              }}
            >
              <option value="">Adicionar item…</option>
              {catalog
                .filter((i) => !w.items.some((it) => it.catalogItemId === i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} · {formatBrlFromCents(i.priceCents)}
                  </option>
                ))}
            </select>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-secondary !py-2 text-sm"
          disabled={windows.length >= 12}
          onClick={() => setWindows((cur) => [...cur, emptyWindow()])}
        >
          Novo horário
        </button>
        <button type="button" className="btn-primary !py-2 text-sm" disabled={saving} onClick={() => void save()}>
          {saving ? "Salvando…" : "Salvar happy hour"}
        </button>
        {ok ? <span className="text-sm text-sage">Salvo.</span> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-chili">{error}</p> : null}
    </section>
  );
}
