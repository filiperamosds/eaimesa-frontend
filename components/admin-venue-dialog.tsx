"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { formatBrlFromCents } from "@eaimesa/shared";
import { billingEventStatusLabel, paymentMethodLabel, planLabel, statusLabel } from "../lib/admin-copy";
import { formatPtDateTime, venueExpiryCopy } from "../lib/admin-venue-expiry";
import { api, ApiError } from "../lib/api";

export type VenueRow = {
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

type PaymentRow = {
  id: string;
  plan: string;
  planName: string;
  method: string;
  amountCents: number;
  provider: string;
  status: string;
  createdAt: string | null;
};

export function AdminVenueDialog({
  venue,
  pending,
  blockDismiss,
  onClose,
  onExpiry,
  onSuspend,
  onUpdated,
}: {
  venue: VenueRow;
  pending: boolean;
  blockDismiss?: boolean;
  onClose: () => void;
  onExpiry: (row: VenueRow) => void;
  onSuspend: (action: "suspend" | "unsuspend") => void;
  onUpdated: (row: VenueRow) => void;
}) {
  const titleId = useId();
  const router = useRouter();
  const [detail, setDetail] = useState<VenueRow>(venue);
  const [slugDraft, setSlugDraft] = useState(venue.slug);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);

  useEffect(() => {
    setDetail(venue);
    setSlugDraft(venue.slug);
  }, [venue]);

  useEffect(() => {
    let cancelled = false;
    setPayments(null);
    setError(null);
    api<{ venue: VenueRow; payments: PaymentRow[] }>(`/v1/platform/venues/${venue.id}`)
      .then((data) => {
        if (cancelled) return;
        setDetail(data.venue);
        setSlugDraft(data.venue.slug);
        setPayments(data.payments);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Falha ao carregar o estabelecimento.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [venue.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !entering && !pending && !blockDismiss && !savingSlug) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, entering, pending, blockDismiss, savingSlug]);

  async function impersonate() {
    if (
      !window.confirm(
        `Entrar no painel de ${detail.name} como o dono?\nA sessão de suporte dura 1 hora. Checkout, cartões e convite de equipe ficam bloqueados.`,
      )
    ) {
      return;
    }
    setEntering(true);
    setError(null);
    try {
      await api(`/v1/platform/venues/${detail.id}/impersonate`, { method: "POST" });
      router.push("/painel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar como dono.");
      setEntering(false);
    }
  }

  async function saveSlug() {
    const next = slugDraft.trim().toLowerCase();
    if (!next || next === detail.slug) return;
    if (
      !window.confirm(
        `Trocar o endereço para /${next}?\nO caminho antigo /${detail.slug} deixa de abrir o cardápio.`,
      )
    ) {
      return;
    }
    setSavingSlug(true);
    setError(null);
    try {
      const updated = await api<VenueRow>(`/v1/platform/venues/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({ slug: next }),
      });
      setDetail(updated);
      setSlugDraft(updated.slug);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível alterar o endereço.");
    } finally {
      setSavingSlug(false);
    }
  }

  const expiry = venueExpiryCopy(detail);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!entering && !pending && !blockDismiss && !savingSlug) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1614] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Estabelecimento</p>
        <h2 id={titleId} className="mt-2 font-serif text-2xl">
          {detail.name}
        </h2>

        <label className="mt-5 block text-sm text-white/70">
          URL do cardápio
          <input
            className="field-night mt-1"
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
            disabled={savingSlug || pending || entering}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <p className="mt-1 text-xs text-white/45">
          O dono não altera o endereço depois do cadastro. Troca só aqui; o caminho antigo passa a dar 404.
        </p>
        {slugDraft.trim().toLowerCase() !== detail.slug ? (
          <button
            type="button"
            disabled={savingSlug || pending || entering}
            onClick={() => void saveSlug()}
            className="btn-secondary mt-2 !bg-white/10 !text-white !py-2 text-sm"
          >
            {savingSlug ? "Salvando…" : "Salvar endereço"}
          </button>
        ) : null}

        <dl className="mt-5 grid gap-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-white/35">Plano ativo</dt>
            <dd className="mt-0.5 text-white/90">
              {planLabel(detail.plan, detail.planName)} · {statusLabel(detail.subscriptionStatus)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-white/35">Dono</dt>
            <dd className="mt-0.5 text-white/90">{detail.ownerEmail || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-white/35">Datas</dt>
            <dd className={`mt-0.5 ${expiry.expired ? "text-chili" : "text-white/90"}`}>
              {expiry.text}
              {expiry.title ? <span className="block text-xs text-white/45">{expiry.title}</span> : null}
            </dd>
            <dd className="mt-1 text-xs text-white/45">
              Trial: {formatPtDateTime(detail.trialEndsAt) ?? "—"}
              <br />
              Vigência paga: {formatPtDateTime(detail.currentPeriodEndsAt) ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wider text-white/35">Pagamentos</p>
          {payments === null ? (
            <p className="mt-2 text-sm text-white/45">Carregando…</p>
          ) : payments.length === 0 ? (
            <p className="mt-2 text-sm text-white/45">Nenhum checkout registrado.</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-white/80">
                    {p.planName} · {paymentMethodLabel(p.method)} · {billingEventStatusLabel(p.status)}
                  </span>
                  <span className="text-white/55">
                    {formatBrlFromCents(p.amountCents)}
                    {p.createdAt ? ` · ${new Date(p.createdAt).toLocaleString("pt-BR")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={entering || pending || savingSlug}
            onClick={() => void impersonate()}
            className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
          >
            {entering ? "Entrando…" : "Entrar como dono"}
          </button>
          <Link
            href={`/admin/cardapio?venue=${encodeURIComponent(detail.id)}`}
            className="btn-ghost text-sm text-white/80"
          >
            Importar cardápio
          </Link>
          <button
            type="button"
            disabled={pending || savingSlug}
            onClick={() => onExpiry(detail)}
            className="btn-ghost text-sm text-white/80"
          >
            Ajustar datas
          </button>
          {detail.subscriptionStatus === "suspended" ? (
            <button
              type="button"
              disabled={pending || entering}
              onClick={() => onSuspend("unsuspend")}
              className="btn-ghost text-sm text-white/80"
            >
              Reativar
            </button>
          ) : (
            <button
              type="button"
              disabled={pending || entering}
              onClick={() => onSuspend("suspend")}
              className="btn-ghost text-sm text-amber"
            >
              Suspender
            </button>
          )}
          <button type="button" disabled={entering || blockDismiss || savingSlug} onClick={onClose} className="btn-ghost ml-auto text-white/80">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
