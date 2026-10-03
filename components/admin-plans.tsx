"use client";

import { formatBrlFromCents, MODULE_GROUP_LABEL, type ModuleGroup, PLAN_KIND_LABEL, type PlanKind } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { AdminNightDialog } from "./admin-night-dialog";
import { MoneyField } from "./masked-fields";
import { PlanPrice } from "./plan-price";

type ModuleCatalogRow = { key: string; name: string; group: ModuleGroup; active: boolean };

type PlanRow = {
  id: string;
  name: string;
  kind: PlanKind;
  priceCents: number;
  promoPriceCents: number | null;
  blurb: string;
  features: string[];
  listed: boolean;
};

type PlansPayload = {
  trialDays: number;
  paidPeriodDays: number;
  plans: PlanRow[];
};

type PlanDraft = {
  name: string;
  kind: PlanKind;
  priceCents: number;
  promoPriceCents: number | null;
  blurb: string;
  features: string;
  listed: boolean;
};

const emptyDraft = (): PlanDraft => ({
  name: "",
  kind: "cardapio",
  priceCents: 0,
  promoPriceCents: null,
  blurb: "",
  features: "",
  listed: true,
});

function draftFromPlan(p: PlanRow): PlanDraft {
  return {
    name: p.name,
    kind: p.kind,
    priceCents: p.priceCents,
    promoPriceCents: p.promoPriceCents ?? null,
    blurb: p.blurb,
    features: p.features.join("\n"),
    listed: p.listed,
  };
}

function featureList(raw: string): string[] {
  return raw
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

export function AdminPlans() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [paidPeriodDays, setPaidPeriodDays] = useState(30);
  const [catalog, setCatalog] = useState<ModuleCatalogRow[]>([]);
  const [planModules, setPlanModules] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);

  async function load() {
    const me = await api<PlansPayload>("/v1/platform/plans");
    setData(me);
    setTrialDays(me.trialDays);
    setPaidPeriodDays(me.paidPeriodDays);
    const mods = await api<{ modules: ModuleCatalogRow[] }>("/v1/platform/modules");
    setCatalog(mods.modules.filter((m) => m.active));
    const pairs = await Promise.all(
      me.plans.map(async (p) => {
        const r = await api<{ modules: string[] }>(`/v1/platform/plans/${p.id}/modules`);
        return [p.id, r.modules] as const;
      }),
    );
    setPlanModules(Object.fromEntries(pairs));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar planos."));
  }, []);

  async function saveSettings() {
    setPending("settings");
    setError(null);
    setOk(null);
    try {
      await api("/v1/platform/settings", {
        method: "PATCH",
        body: JSON.stringify({ trialDays, paidPeriodDays }),
      });
      setOk("Trial e vigência atualizados.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(null);
    }
  }

  if (!data) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Catálogo</p>
          <h1 className="mt-2 font-serif text-3xl">Planos</h1>
        </div>
        <button
          type="button"
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
          onClick={() => {
            setOk(null);
            setEditing("new");
          }}
        >
          Adicionar
        </button>
      </div>
      <p className="text-sm text-white/45">Clique no plano para editar preço, promo e módulos.</p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="font-medium">Trial e vigência</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Dias de trial</span>
            <input
              className="field-night"
              type="number"
              min={0}
              max={90}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Dias da vigência paga</span>
            <input
              className="field-night"
              type="number"
              min={1}
              max={366}
              value={paidPeriodDays}
              onChange={(e) => setPaidPeriodDays(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void saveSettings()}
          className="btn-primary mt-4 !py-2 text-sm"
        >
          Salvar prazos
        </button>
      </div>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {data.plans.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                setOk(null);
                setEditing(p);
              }}
              className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {p.name} <span className="text-white/40">{p.id}</span>
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {PLAN_KIND_LABEL[p.kind]} · {p.listed ? "Na vitrine" : "Oculto"}
                </p>
              </div>
              <p className="text-sm text-white/80 sm:shrink-0">
                {p.promoPriceCents != null ? (
                  <PlanPrice
                    priceCents={p.priceCents}
                    promoPriceCents={p.promoPriceCents}
                    suffix="/mês"
                    className="text-white/80"
                    mutedClassName="text-white/45"
                  />
                ) : (
                  `${formatBrlFromCents(p.priceCents)}/mês`
                )}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {data.plans.length === 0 ? <p className="text-sm text-white/45">Nenhum plano ainda.</p> : null}

      {editing ? (
        <PlanDialog
          plan={editing === "new" ? null : editing}
          catalog={catalog}
          moduleKeys={editing === "new" ? [] : (planModules[editing.id] ?? [])}
          pending={pending !== null}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setOk(msg);
            setError(null);
            await load();
            setEditing(null);
          }}
          setPending={setPending}
        />
      ) : null}
    </div>
  );
}

function PlanDialog({
  plan,
  catalog,
  moduleKeys,
  pending,
  onClose,
  onSaved,
  setPending,
}: {
  plan: PlanRow | null;
  catalog: ModuleCatalogRow[];
  moduleKeys: string[];
  pending: boolean;
  onClose: () => void;
  onSaved: (msg: string) => Promise<void>;
  setPending: (v: string | null) => void;
}) {
  const creating = plan === null;
  const [draft, setDraft] = useState<PlanDraft>(() => (plan ? draftFromPlan(plan) : emptyDraft()));
  const [keys, setKeys] = useState<string[]>(moduleKeys);
  const [localError, setLocalError] = useState<string | null>(null);

  function toggleModule(key: string, on: boolean) {
    setKeys((cur) => {
      const set = new Set(cur);
      if (on) set.add(key);
      else set.delete(key);
      return [...set];
    });
  }

  async function save() {
    setPending(creating ? "create" : plan.id);
    setLocalError(null);
    try {
      if (creating) {
        const created = await api<{ id: string }>("/v1/platform/plans", {
          method: "POST",
          body: JSON.stringify({
            name: draft.name,
            kind: draft.kind,
            priceCents: draft.priceCents,
            promoPriceCents: draft.promoPriceCents,
            blurb: draft.blurb,
            features: featureList(draft.features),
            listed: draft.listed,
          }),
        });
        if (keys.length > 0) {
          await api(`/v1/platform/plans/${created.id}/modules`, {
            method: "PUT",
            body: JSON.stringify({ modules: keys }),
          });
        }
        await onSaved("Plano criado. Já aparece na vitrine se estiver listado.");
      } else {
        await api(`/v1/platform/plans/${plan.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name,
            kind: draft.kind,
            priceCents: draft.priceCents,
            promoPriceCents: draft.promoPriceCents,
            blurb: draft.blurb,
            features: featureList(draft.features),
            listed: draft.listed,
          }),
        });
        await api(`/v1/platform/plans/${plan.id}/modules`, {
          method: "PUT",
          body: JSON.stringify({ modules: keys }),
        });
        await onSaved("Plano salvo. Landing, cadastro e checkout usam o valor novo.");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível salvar.";
      setLocalError(msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <AdminNightDialog
      kicker="Plano"
      title={creating ? "Novo plano" : draft.name || plan.name}
      pending={pending}
      wide
      onClose={onClose}
    >
      <p className="mt-1 text-sm text-white/45">
        {creating
          ? "O nome vira o identificador (ex. Cardápio Plus). O tipo define o que o estabelecimento pode fazer."
          : plan.id}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Nome</span>
          <input
            className="field-night"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Cardápio Plus"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Tipo</span>
          <select
            className="field-night"
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as PlanKind }))}
          >
            <option value="cardapio">{PLAN_KIND_LABEL.cardapio}</option>
            <option value="auto_atendimento">{PLAN_KIND_LABEL.auto_atendimento}</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Preço mensal</span>
          <MoneyField
            className="field-night"
            cents={draft.priceCents}
            onCentsChange={(cents) => setDraft((d) => ({ ...d, priceCents: cents ?? 0 }))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Preço promoção (opcional)</span>
          <MoneyField
            className="field-night"
            cents={draft.promoPriceCents}
            onCentsChange={(cents) => setDraft((d) => ({ ...d, promoPriceCents: cents }))}
            placeholder="vazio = sem promo"
          />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-white/60">Texto curto</span>
        <input
          className="field-night"
          value={draft.blurb}
          onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-white/60">O que inclui (um por linha)</span>
        <textarea
          className="field-night min-h-24"
          value={draft.features}
          onChange={(e) => setDraft((d) => ({ ...d, features: e.target.value }))}
        />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.listed}
          onChange={(e) => setDraft((d) => ({ ...d, listed: e.target.checked }))}
        />
        Listado na vitrine
      </label>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium">Módulos do plano</p>
        <p className="mt-1 text-xs text-white/45">O que este plano libera. Estabelecimentos do plano refletem a mudança.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {catalog.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={keys.includes(m.key)}
                onChange={(e) => toggleModule(m.key, e.target.checked)}
              />
              <span>
                {m.name}
                <span className="ml-1 text-xs text-white/35">· {MODULE_GROUP_LABEL[m.group]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {localError ? <p className="mt-3 text-sm text-chili">{localError}</p> : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className="btn-ghost text-white/80">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
        >
          {pending ? "Salvando…" : creating ? "Criar" : "Salvar"}
        </button>
      </div>
    </AdminNightDialog>
  );
}
