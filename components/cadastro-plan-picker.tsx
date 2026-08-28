"use client";

import type { BillingPlan } from "../lib/load-billing-plans";
import { PlanPrice } from "./plan-price";

export function CadastroPlanPicker({
  plans,
  plan,
  onChange,
  trialDays,
  tone,
}: {
  plans: BillingPlan[];
  plan: string;
  onChange: (id: string) => void;
  trialDays: number;
  tone: "night" | "paper";
}) {
  const night = tone === "night";
  const selected = plans.find((p) => p.id === plan);

  return (
    <fieldset>
      <legend
        className={
          night
            ? "mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-amber"
            : "mb-2 text-sm font-medium"
        }
      >
        {night
          ? `Planos · trial de ${trialDays} dias`
          : `Plano (trial de ${trialDays} dias após confirmar o e-mail)`}
      </legend>
      <div className={night ? "space-y-2" : "grid gap-2 sm:grid-cols-2"}>
        {plans.map((p) => {
          const active = plan === p.id;
          return (
            <label
              key={p.id}
              className={
                night
                  ? `block cursor-pointer rounded-2xl border px-4 py-3 text-sm transition ${
                      active ? "border-amber bg-white/10" : "border-white/15 hover:border-white/30"
                    }`
                  : `cursor-pointer rounded-2xl border px-3 py-3 text-sm ${
                      active ? "border-chili bg-chili/5" : "border-line"
                    }`
              }
            >
              <input
                type="radio"
                name={night ? "cadastro-plan-aside" : "cadastro-plan"}
                value={p.id}
                checked={active}
                onChange={() => onChange(p.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span className={night ? "font-medium text-white" : "block font-medium"}>{p.name}</span>
                {night && active ? (
                  <span className="shrink-0 rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">
                    Selecionado
                  </span>
                ) : null}
              </span>
              <span className={night ? "mt-1 block text-amber" : "mt-1 block text-chili"}>
                <PlanPrice
                  priceCents={p.priceCents}
                  promoPriceCents={p.promoPriceCents}
                  suffix="/mês"
                  className="text-base"
                  mutedClassName={night ? "text-white/40" : undefined}
                />
              </span>
              {night && active ? (
                <>
                  <span className="mt-2 block text-xs leading-relaxed text-white/65">{p.blurb}</span>
                  {p.features.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-white/55">
                      {p.features.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <span className={night ? "mt-1 block text-xs text-white/45" : "mt-1 block text-xs text-ink-soft"}>
                  {p.blurb}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {night && selected ? (
        <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/70">
          <span className="text-white/40">Selecionado · </span>
          <span className="text-white">{selected.name}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
