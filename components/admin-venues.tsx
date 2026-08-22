"use client";

import { useEffect, useId, useState } from "react";
import { planLabel, statusLabel } from "../lib/admin-copy";
import {
  datetimeLocalToIsoUtc,
  isoToDatetimeLocal,
  venueExpiryCopy,
} from "../lib/admin-venue-expiry";
import { api, ApiError } from "../lib/api";

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planName: string;
  subscriptionStatus: string;
  acceptsOrders?: boolean;
  ownerEmail: string;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  createdAt: string;
};

type CatalogPlan = { id: string; name: string };

type ExpiryDraft = {
  trialEndsAt: string;
  currentPeriodEndsAt: string;
};

function expiryFieldHint(status: string): string {
  if (status === "trial") {
    return "Bar em trial — o campo principal é o fim do teste. A vigência paga entra depois do checkout.";
  }
  if (status === "suspended") {
    return "Bar bloqueado. As datas continuam visíveis; reative quando quiser liberar de novo.";
  }
  return "Bar com assinatura — o campo principal é a vigência paga. O trial serve de fallback se a vigência estiver vazia.";
}

function AdminVenueExpiryDialog({
  venue,
  onClose,
  onSaved,
}: {
  venue: VenueRow;
  onClose: () => void;
  onSaved: (updated: VenueRow) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<ExpiryDraft>(() => ({
    trialEndsAt: isoToDatetimeLocal(venue.trialEndsAt),
    currentPeriodEndsAt: isoToDatetimeLocal(venue.currentPeriodEndsAt),
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function save() {
    const body: { trialEndsAt?: string; currentPeriodEndsAt?: string } = {};
    if (draft.trialEndsAt !== isoToDatetimeLocal(venue.trialEndsAt)) {
      const iso = datetimeLocalToIsoUtc(draft.trialEndsAt);
      if (draft.trialEndsAt && !iso) {
        setError("Data de trial inválida.");
        return;
      }
      if (iso) body.trialEndsAt = iso;
    }
    if (draft.currentPeriodEndsAt !== isoToDatetimeLocal(venue.currentPeriodEndsAt)) {
      const iso = datetimeLocalToIsoUtc(draft.currentPeriodEndsAt);
      if (draft.currentPeriodEndsAt && !iso) {
        setError("Data de vigência inválida.");
        return;
      }
      if (iso) body.currentPeriodEndsAt = iso;
    }
    if (!body.trialEndsAt && !body.currentPeriodEndsAt) {
      setError("Altere ao menos uma data.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const updated = await api<VenueRow>(`/v1/platform/venues/${venue.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  const trialPrimary = venue.subscriptionStatus === "trial";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1614] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Expiração</p>
        <h2 id={titleId} className="mt-2 font-serif text-2xl">
          Ajustar {venue.name}
        </h2>
        <p className="mt-2 text-sm text-white/55">{expiryFieldHint(venue.subscriptionStatus)}</p>
        <p className="mt-2 text-xs text-white/40">Alteração administrativa; não altera cobrança no gateway.</p>

        <label className="mt-5 block text-sm text-white/70">
          Fim do trial{trialPrimary ? " (principal)" : ""}
          <input
            type="datetime-local"
            className="field-night mt-1"
            value={draft.trialEndsAt}
            onChange={(e) => setDraft((d) => ({ ...d, trialEndsAt: e.target.value }))}
          />
        </label>
        <label className="mt-3 block text-sm text-white/70">
          Fim da vigência paga{trialPrimary ? "" : " (principal)"}
          <input
            type="datetime-local"
            className="field-night mt-1"
            value={draft.currentPeriodEndsAt}
            onChange={(e) => setDraft((d) => ({ ...d, currentPeriodEndsAt: e.target.value }))}
          />
        </label>

        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}

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
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminVenues() {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<VenueRow[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState<VenueRow | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (plan) params.set("plan", plan);
    if (status) params.set("status", status);
    const qs = params.toString();
    const [data, catalog] = await Promise.all([
      api<{ venues: VenueRow[] }>(`/v1/platform/venues${qs ? `?${qs}` : ""}`),
      api<{ plans: CatalogPlan[] }>("/v1/platform/plans"),
    ]);
    setRows(data.venues);
    setPlans(catalog.plans);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao listar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: "suspend" | "unsuspend") {
    setPending(id);
    setError(null);
    setOk(null);
    try {
      await api(`/v1/platform/venues/${id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    } finally {
      setPending(null);
    }
  }

  function applyUpdated(updated: VenueRow) {
    setRows((cur) => cur.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    setEditing(null);
    setOk("Expiração atualizada.");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Tenants</p>
        <h1 className="mt-2 font-serif text-3xl">Estabelecimentos</h1>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setOk(null);
          load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao listar."));
        }}
      >
        <input
          className="field-night max-w-xs"
          placeholder="Nome ou slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field-night max-w-[12rem]" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="field-night max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="trial">Em trial</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
          <option value="past_due">Inadimplente</option>
        </select>
        <button type="submit" className="btn-secondary !bg-white/10 !text-white">
          Filtrar
        </button>
      </form>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rows.map((v) => {
          const expiry = venueExpiryCopy(v);
          return (
            <li
              key={v.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {v.name} <span className="text-white/40">/{v.slug}</span>
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {planLabel(v.plan, v.planName)} · {statusLabel(v.subscriptionStatus)} · {v.ownerEmail}
                </p>
              </div>
              <div className="min-w-0 sm:w-44 sm:shrink-0">
                <p className="text-[11px] uppercase tracking-wider text-white/35 sm:hidden">Expiração</p>
                <p
                  className={`truncate text-sm ${expiry.expired ? "text-chili" : "text-white/80"}`}
                  title={expiry.title || expiry.text}
                >
                  {expiry.text}
                </p>
                {v.subscriptionStatus === "suspended" ? (
                  <span className="mt-1 inline-block rounded-full border border-amber/40 px-2 py-0.5 text-[11px] uppercase tracking-wider text-amber">
                    Suspenso
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  disabled={pending === v.id}
                  onClick={() => {
                    setOk(null);
                    setEditing(v);
                  }}
                  className="btn-ghost text-sm text-white/80"
                >
                  Ajustar expiração
                </button>
                {v.subscriptionStatus === "suspended" ? (
                  <button
                    type="button"
                    disabled={pending === v.id}
                    onClick={() => void act(v.id, "unsuspend")}
                    className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
                  >
                    Reativar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending === v.id}
                    onClick={() => void act(v.id, "suspend")}
                    className="btn-ghost text-sm text-amber"
                  >
                    Suspender
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-white/45">Nenhum bar com esse filtro.</p> : null}
      {editing ? (
        <AdminVenueExpiryDialog venue={editing} onClose={() => setEditing(null)} onSaved={applyUpdated} />
      ) : null}
    </div>
  );
}
