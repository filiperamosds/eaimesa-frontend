"use client";

import {
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_POLL_TIMEOUT_MS,
  ERROR_CODES,
  formatBrlFromCents,
  formatSavedCardLabel,
  isPaidPeriodOpen,
  isRepresentativeComplete,
  PAID_PERIOD_DAYS,
  planRank,
  upgradeQuoteLine,
  type CheckoutMode,
  type CheckoutCreditCard,
  type CheckoutPayer,
  type PaymentMethod,
  type SavedCard,
  type ScheduledDowngrade,
  type SubscriptionCancellation,
  type UpgradeQuote,
} from "@eaimesa/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { statusLabel } from "../lib/admin-copy";
import { stackedPeriodCopy } from "../lib/billing-prompt";
import type { BillingGateway, PendingCheckout } from "../lib/load-billing-plans";
import type { Session, Venue } from "../lib/types";
import { PaymentForm } from "./payment-form";
import { PlanPrice, planCtaPrice } from "./plan-price";
import { SavedCardsPanel } from "./saved-cards-panel";

type BillingPlanRow = {
  id: string;
  name: string;
  kind?: string;
  priceCents: number;
  promoPriceCents?: number | null;
  effectivePriceCents?: number;
  blurb: string;
  features: string[];
};

type BillingMe = {
  venue: Venue;
  entitlement: { ok: boolean; message?: string };
  canUpgrade: boolean;
  canDowngrade: boolean;
  canScheduleDowngrade?: boolean;
  canCancelSubscription?: boolean;
  scheduledDowngrade?: ScheduledDowngrade | null;
  cancellation?: SubscriptionCancellation | null;
  upgradeQuotes?: UpgradeQuote[];
  plans: BillingPlanRow[];
  gateway?: BillingGateway;
  pendingCheckout?: PendingCheckout | null;
  paidPeriodDays?: number;
  savedCard?: { id?: string; last4: string; brand?: string | null } | null;
  savedCards?: SavedCard[];
};

type CheckoutResult = {
  status: "success" | "pending";
  provider: string;
  method?: string;
  plan: string;
  planName: string;
  amountCents: number;
  creditCents?: number;
  recurringAmountCents?: number;
  subscriptionStatus: string;
  currentPeriodEndsAt?: string | null;
  checkoutUrl?: string | null;
  savedCards?: SavedCard[];
  message: string;
};

type NoticeKind = "waiting" | "confirmed" | "cancel" | "expired" | "info";

const FALLBACK_GATEWAY: BillingGateway = {
  provider: "stub",
  checkoutMode: "immediate",
  methods: ["card", "pix"],
  requiresPayer: false,
  available: true,
};

function resolveGateway(data: BillingMe | null): BillingGateway {
  const g = data?.gateway;
  if (!g) return FALLBACK_GATEWAY;
  const raw = g.methods;
  const methods = (Array.isArray(raw) ? raw : []).filter(
    (m): m is PaymentMethod => m === "card" || m === "pix",
  );
  const mode: CheckoutMode =
    g.checkoutMode === "hosted" || g.checkoutMode === "inline" ? g.checkoutMode : "immediate";
  return {
    provider: g.provider || FALLBACK_GATEWAY.provider,
    checkoutMode: mode,
    methods: methods.length ? methods : FALLBACK_GATEWAY.methods,
    requiresPayer: Boolean(g.requiresPayer),
    requiresCreditCard: Boolean(g.requiresCreditCard),
    available: g.available !== false,
  };
}

function checkoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === ERROR_CODES.PAYER_REQUIRED) {
      return "Cadastre o responsável em Configurações ou informe o pagador no checkout.";
    }
    if (err.code === ERROR_CODES.ALREADY_SUBSCRIBED) {
      return "Este plano já está ativo. Troque de plano ou gerencie o cartão.";
    }
    if (err.code === ERROR_CODES.ALREADY_CANCELED) {
      return "A assinatura já está cancelada. O acesso segue até o fim da vigência.";
    }
    if (err.code === ERROR_CODES.NOTHING_TO_CANCEL) {
      return "Não há assinatura vigente para cancelar.";
    }
    if (err.code === ERROR_CODES.PLAN_DOWNGRADE_LOCKED) {
      return "Não dá para descer de plano no meio da vigência. Você pode agendar o downgrade para o fim do período pago.";
    }
    if (err.code === ERROR_CODES.CREDIT_CARD_REQUIRED || err.code === ERROR_CODES.CARD_REQUIRED) {
      return "Informe os dados do cartão ou use um cartão salvo.";
    }
    return err.message;
  }
  return "Não foi possível concluir o pagamento.";
}

function formatAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

function stripCheckoutQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

function quoteFor(data: BillingMe, planId: string): UpgradeQuote | undefined {
  return (data.upgradeQuotes ?? []).find((q) => q.plan === planId);
}

export function BillingPanel() {
  const path = usePathname();
  const [data, setData] = useState<BillingMe | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutResult | null>(null);
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [lockedDowngradePlan, setLockedDowngradePlan] = useState<string | null>(null);
  const pollAbort = useRef(false);

  async function load(): Promise<BillingMe> {
    const me = await api<BillingMe>("/v1/billing/me");
    setData(me);
    return me;
  }

  function stopPoll() {
    pollAbort.current = true;
    setPolling(false);
  }

  function startPoll() {
    pollAbort.current = false;
    setPolling(true);
    const started = Date.now();

    const tick = async () => {
      if (pollAbort.current) return;
      await new Promise((resolve) => setTimeout(resolve, CHECKOUT_POLL_INTERVAL_MS));
      if (pollAbort.current) return;
      if (Date.now() - started >= CHECKOUT_POLL_TIMEOUT_MS) {
        setPolling(false);
        setNotice({
          kind: "waiting",
          text: "Ainda não confirmamos o pagamento. Atualize a página em alguns instantes.",
        });
        return;
      }
      try {
        const me = await load();
        if (me.venue.subscriptionStatus === "active") {
          setPolling(false);
          setNotice({
            kind: "confirmed",
            text: "Pagamento confirmado. O plano está ativo.",
          });
          return;
        }
        await tick();
      } catch (err) {
        setPolling(false);
        setError(checkoutErrorMessage(err));
      }
    };

    void tick();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, session] = await Promise.all([
          api<BillingMe>("/v1/billing/me"),
          api<Session>("/v1/auth/me").catch(() => null),
        ]);
        if (cancelled) return;
        setData(me);
        if (session?.account.email) setAccountEmail(session.account.email);

        const params = new URLSearchParams(window.location.search);
        const wanted = params.get("plano") ?? params.get("plan");
        const fromQuery = wanted && me.plans.some((p) => p.id === wanted) ? wanted : null;
        const onPagamento = path.includes("/pagamento");
        const paidOpen = isPaidPeriodOpen(me.venue);
        const queryIsCurrent = fromQuery === me.venue.plan && paidOpen;
        const openId =
          fromQuery && !queryIsCurrent
            ? fromQuery
            : onPagamento && !paidOpen
              ? (me.plans.some((p) => p.id === me.venue.plan) ? me.venue.plan : (me.plans[0]?.id ?? null))
              : null;
        if (openId) setCheckoutPlan(openId);
        if (queryIsCurrent) {
          setNotice({
            kind: "info",
            text: "Este plano já está ativo. Gerencie o cartão ou escolha outro plano.",
          });
        }

        const flag = params.get("checkout");
        stripCheckoutQuery();
        if (flag === "ok") {
          if (me.venue.subscriptionStatus === "active") {
            setNotice({ kind: "confirmed", text: "Pagamento confirmado. O plano está ativo." });
          } else {
            setNotice({
              kind: "waiting",
              text: "Estamos confirmando o pagamento. Isso pode levar alguns instantes.",
            });
            startPoll();
          }
        } else if (flag === "cancel") {
          setNotice({
            kind: "cancel",
            text: "Pagamento cancelado. Você pode tentar de novo quando quiser.",
          });
        } else if (flag === "expired") {
          setNotice({
            kind: "expired",
            text: "O link de pagamento expirou. Inicie um novo pagamento.",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Falha ao carregar o plano.");
        }
      }
    })();
    return () => {
      cancelled = true;
      stopPoll();
    };
    // Poll is started only from this mount path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  function scrollToCards() {
    setCheckoutPlan(null);
    document.getElementById("cartoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function scheduleDowngrade(plan: string) {
    setError(null);
    setSuccess(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await api<{
        ok?: boolean;
        scheduledPlanName?: string;
        scheduledPlanAt?: string;
        message?: string;
      }>("/v1/billing/schedule-downgrade", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      setCheckoutPlan(null);
      setLockedDowngradePlan(null);
      setNotice({
        kind: "info",
        text:
          result.message ??
          `Downgrade agendado${result.scheduledPlanAt ? ` para ${formatAt(result.scheduledPlanAt)}` : ""}.`,
      });
      await load();
    } catch (err) {
      setError(checkoutErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function cancelSubscription() {
    setError(null);
    setSuccess(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await api<{
        ok?: boolean;
        canceledAt?: string;
        accessUntil?: string | null;
        message?: string;
      }>("/v1/billing/cancel-subscription", { method: "POST" });
      setCheckoutPlan(null);
      setLockedDowngradePlan(null);
      const until = result.accessUntil ? formatAt(result.accessUntil) : null;
      setNotice({
        kind: "info",
        text:
          result.message ??
          (until
            ? `Assinatura cancelada. Não haverá novas cobranças. O sistema continua até ${until}.`
            : "Assinatura cancelada. Não haverá novas cobranças."),
      });
      await load();
    } catch (err) {
      setError(checkoutErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function confirmAndCancel() {
    if (!data) return;
    const when = data.venue.currentPeriodEndsAt
      ? formatAt(data.venue.currentPeriodEndsAt)
      : "o fim da vigência";
    if (
      !confirm(
        `Cancelar a assinatura? Não haverá novas cobranças. O sistema continua até ${when}.`,
      )
    ) {
      return;
    }
    void cancelSubscription();
  }

  async function pay(
    plan: string,
    method: PaymentMethod,
    payer?: CheckoutPayer,
    creditCard?: CheckoutCreditCard,
  ) {
    const gateway = resolveGateway(data);
    if (!gateway.available) {
      setError("Pagamento indisponível no momento.");
      return;
    }
    setError(null);
    setSuccess(null);
    setNotice(null);
    setLockedDowngradePlan(null);
    setPending(true);
    try {
      const body: {
        plan: string;
        method: PaymentMethod;
        payer?: CheckoutPayer;
        creditCard?: CheckoutCreditCard;
      } = { plan, method };
      if (payer) body.payer = payer;
      if (creditCard) body.creditCard = creditCard;
      const result = await api<CheckoutResult>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (method === "pix" && result.status === "pending" && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.status === "success") {
        setSuccess(result);
        setCheckoutPlan(null);
        await load();
        return;
      }
      setError(result.message || "Não foi possível iniciar o pagamento.");
    } catch (err) {
      if (err instanceof ApiError && err.code === ERROR_CODES.ALREADY_SUBSCRIBED) {
        setCheckoutPlan(null);
        setError(checkoutErrorMessage(err));
        return;
      }
      if (err instanceof ApiError && err.code === ERROR_CODES.PLAN_DOWNGRADE_LOCKED) {
        setCheckoutPlan(null);
        setLockedDowngradePlan(plan);
        setError(checkoutErrorMessage(err));
        return;
      }
      setError(checkoutErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!data) {
    return <p className="text-ink-soft">{error ?? "Carregando plano…"}</p>;
  }

  const gateway = resolveGateway(data);
  const current = data.venue.plan;
  const currentKind = data.venue.planKind ?? data.venue.plan;
  const selected = data.plans.find((p) => p.id === checkoutPlan);
  const cols = data.plans.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";
  const hosted = gateway.checkoutMode === "hosted";
  const checkoutMode: CheckoutMode = gateway.checkoutMode;
  const asaas = gateway.provider === "asaas" || hosted || checkoutMode === "inline";
  const payDisabled = pending || polling || !gateway.available;
  const paidDays = data.paidPeriodDays ?? PAID_PERIOD_DAYS;
  const stacked = stackedPeriodCopy(data.venue, paidDays);
  const paidOpen = isPaidPeriodOpen(data.venue);
  const savedCards = data.savedCards?.length
    ? data.savedCards
    : data.savedCard?.last4
      ? [
          {
            id: data.savedCard.id ?? "legacy",
            last4: data.savedCard.last4,
            brand: data.savedCard.brand,
            isDefault: true,
          },
        ]
      : [];
  const defaultCard = savedCards.find((c) => c.isDefault) ?? savedCards[0] ?? null;
  const selectedQuote = selected ? quoteFor(data, selected.id) : undefined;
  const chargeCents = selectedQuote?.amountCents ?? selected?.effectivePriceCents ?? selected?.priceCents ?? 0;
  const representativeOk = isRepresentativeComplete(data.venue.representative);
  const noticeClass =
    notice?.kind === "confirmed"
      ? "border-sage/40 bg-sage/10"
      : notice?.kind === "waiting" || notice?.kind === "info"
        ? "border-line bg-paper-2/60"
        : "border-chili/30 bg-chili/5";

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <p className="eyebrow">Plano</p>
        <h2 className="mt-2 font-serif text-2xl">{data.venue.planName ?? current}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Status:{" "}
          {data.cancellation?.canceledAt
            ? `Cancelada${
                data.cancellation.accessUntil
                  ? ` · disponível até ${formatAt(data.cancellation.accessUntil)}`
                  : ""
              }`
            : statusLabel(data.venue.subscriptionStatus)}
          {!data.cancellation?.canceledAt && data.venue.subscriptionStatus === "trial" && data.venue.trialEndsAt
            ? ` · trial até ${formatAt(data.venue.trialEndsAt)}`
            : null}
          {!data.cancellation?.canceledAt && data.venue.currentPeriodEndsAt
            ? ` · vigência até ${formatAt(data.venue.currentPeriodEndsAt)}`
            : null}
        </p>
        {defaultCard ? (
          <p className="mt-2 text-sm text-ink-soft">Cartão: {formatSavedCardLabel(defaultCard)}</p>
        ) : null}
        {!data.entitlement.ok ? (
          <p className="mt-3 text-sm text-chili">{data.entitlement.message}</p>
        ) : null}
      </div>

      {data.scheduledDowngrade?.at ? (
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-5">
          <p className="text-sm font-medium">
            Muda em {formatAt(data.scheduledDowngrade.at)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            No fim da vigência o plano passa para{" "}
            {data.scheduledDowngrade.planName ?? data.scheduledDowngrade.plan}. Até lá o plano atual
            continua.
          </p>
        </div>
      ) : null}

      {data.cancellation?.canceledAt ? (
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-5">
          <p className="text-sm font-medium">Assinatura cancelada</p>
          <p className="mt-1 text-sm text-ink-soft">
            Não haverá novas cobranças.
            {data.cancellation.accessUntil
              ? ` O sistema continua disponível até ${formatAt(data.cancellation.accessUntil)}.`
              : " O sistema continua disponível até o fim da vigência."}
          </p>
        </div>
      ) : null}

      {!gateway.available ? (
        <p className="rounded-2xl border border-chili/30 bg-chili/5 p-4 text-sm text-chili">
          Pagamento indisponível no momento. Tente de novo mais tarde.
        </p>
      ) : null}

      {notice ? (
        <div className={`rounded-2xl border p-5 ${noticeClass}`}>
          <p className="text-sm">{notice.text}</p>
          {polling ? <p className="mt-1 text-sm text-ink-soft">Aguardando confirmação…</p> : null}
        </div>
      ) : null}

      {data.pendingCheckout?.url && gateway.available ? (
        <div className="rounded-2xl border border-line bg-paper-2/60 p-5">
          <p className="text-sm font-medium">Há um pagamento em andamento.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Continue na página do provedor. O plano só fica ativo depois da confirmação. PIX exige um
            novo pagamento a cada renovação.
          </p>
          <button
            type="button"
            className="btn-primary mt-3 !py-2 text-sm"
            onClick={() => window.location.assign(data.pendingCheckout!.url)}
          >
            Continuar pagamento
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-sage/40 bg-sage/10 p-5">
          <p className="text-sm font-medium text-sage">Pagamento aprovado</p>
          <p className="mt-1 text-sm">
            {success.planName} · hoje {formatBrlFromCents(success.amountCents)}
            {success.creditCents ? ` (crédito ${formatBrlFromCents(success.creditCents)})` : null}
            {success.recurringAmountCents
              ? ` · depois ${formatBrlFromCents(success.recurringAmountCents)}/mês`
              : null}
            {success.method ? ` · ${success.method === "pix" ? "PIX" : "cartão"}` : null}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{success.message}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      {lockedDowngradePlan ? (
        <div className="rounded-2xl border border-line bg-paper-2/60 p-5">
          <p className="text-sm font-medium">Agendar downgrade</p>
          <p className="mt-1 text-sm text-ink-soft">
            O plano mais barato começa no fim da vigência atual
            {data.venue.currentPeriodEndsAt ? ` (${formatAt(data.venue.currentPeriodEndsAt)})` : ""}.
            Até lá nada muda no acesso.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary !py-2 text-sm"
              disabled={payDisabled}
              onClick={() => void scheduleDowngrade(lockedDowngradePlan)}
            >
              Agendar downgrade
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={pending}
              onClick={() => setLockedDowngradePlan(null)}
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        gateway.provider === "asaas" && !representativeOk ? (
          <div className="rounded-2xl border border-chili/30 bg-chili/5 p-5">
            <p className="text-sm font-medium text-chili">Cadastre o responsável</p>
            <p className="mt-1 text-sm text-ink-soft">
              Para cartão no Asaas é preciso nome, CPF/CNPJ, e-mail, telefone, CEP e número. Sem isso
              o checkout falha com PAYER_REQUIRED.
            </p>
            <Link
              href="/painel/configuracoes/responsavel"
              className="btn-primary mt-4 inline-flex !py-2 text-sm"
            >
              Cadastre o responsável
            </Link>
            <button
              type="button"
              className="btn-ghost mt-2 block text-sm"
              onClick={() => setCheckoutPlan(null)}
            >
              Voltar aos planos
            </button>
          </div>
        ) : paidOpen && selected.id === current ? (
          <div className="rounded-2xl border border-line bg-paper-2/60 p-5">
            <p className="text-sm font-medium">Este plano já está ativo</p>
            <p className="mt-1 text-sm text-ink-soft">
              Não é possível pagar de novo o mesmo SKU. Troque de plano ou gerencie o cartão da
              assinatura.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary !py-2 text-sm" onClick={scrollToCards}>
                Gerenciar cartão
              </button>
              {data.canCancelSubscription ? (
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={pending}
                  onClick={confirmAndCancel}
                >
                  Cancelar assinatura
                </button>
              ) : null}
              <button type="button" className="btn-ghost text-sm" onClick={() => setCheckoutPlan(null)}>
                Trocar plano
              </button>
            </div>
          </div>
        ) : (
          <PaymentForm
            planName={selected.name}
            amountCents={chargeCents}
            listPriceCents={selected.priceCents}
            promoPriceCents={selected.promoPriceCents}
            upgradeQuote={selectedQuote ?? null}
            pending={pending}
            checkoutMode={checkoutMode}
            requiresPayer={gateway.requiresPayer}
            methods={gateway.methods}
            defaultEmail={accountEmail}
            initialPayer={data.venue.representative ?? null}
            provider={gateway.provider}
            coverageNote={stacked.text}
            savedCards={savedCards}
            onCancel={() => {
              if (!pending) setCheckoutPlan(null);
            }}
            onPay={(method, payer, creditCard) => void pay(selected.id, method, payer, creditCard)}
          />
        )
      ) : (
        <div className={`grid gap-3 ${cols}`}>
          {data.plans.map((p) => {
            const isCurrent = p.id === current;
            const rank = planRank(p.kind ?? p.id);
            const currentRank = planRank(currentKind);
            const upgrade = !isCurrent && rank > currentRank;
            const downgrade = !isCurrent && rank < currentRank;
            const lateral = !isCurrent && rank === currentRank;
            const already = isCurrent && paidOpen;
            const schedule = downgrade && Boolean(data.canScheduleDowngrade);
            const quote = quoteFor(data, p.id);
            const enabled =
              !already &&
              (isCurrent || upgrade || lateral || (downgrade && !paidOpen) || schedule) &&
              !payDisabled;
            return (
              <div key={p.id} className="surface p-5">
                <p className="font-serif text-xl">{p.name}</p>
                <p className="mt-1 font-medium text-chili">
                  <PlanPrice
                    priceCents={p.priceCents}
                    promoPriceCents={p.promoPriceCents}
                    suffix="/mês"
                    className="text-lg"
                  />
                </p>
                {quote?.isUpgrade ? (
                  <p className="mt-1 text-sm text-ink-soft">{upgradeQuoteLine(quote)}</p>
                ) : null}
                <p className="mt-2 text-sm text-ink-soft">{p.blurb}</p>
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  {p.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {already ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled className="btn-primary !py-2 text-sm disabled:opacity-50">
                      Plano atual
                    </button>
                    <button type="button" className="btn-ghost text-sm" onClick={scrollToCards}>
                      Gerenciar cartão
                    </button>
                    {data.canCancelSubscription ? (
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        disabled={pending}
                        onClick={confirmAndCancel}
                      >
                        Cancelar assinatura
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => {
                      setSuccess(null);
                      setError(null);
                      setLockedDowngradePlan(null);
                      if (schedule) {
                        const when = data.venue.currentPeriodEndsAt
                          ? formatAt(data.venue.currentPeriodEndsAt)
                          : "o fim da vigência";
                        if (!confirm(`Agendar ${p.name} para ${when}? Até lá o plano atual continua.`)) {
                          return;
                        }
                        void scheduleDowngrade(p.id);
                        return;
                      }
                      setCheckoutPlan(p.id);
                    }}
                    className="btn-primary mt-4 !py-2 text-sm disabled:opacity-50"
                  >
                    {isCurrent
                      ? `Pagar ${planCtaPrice(p)}`
                      : upgrade
                        ? `Subir · ${quote ? upgradeQuoteLine(quote) : planCtaPrice(p)}`
                        : lateral
                          ? `Trocar · ${planCtaPrice(p)}`
                          : schedule
                            ? "Agendar downgrade"
                            : `Descer · ${planCtaPrice(p)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SavedCardsPanel
        cards={savedCards}
        asaas={asaas}
        representativeOk={representativeOk}
        disabled={payDisabled}
        onReload={async () => {
          await load();
        }}
      />
    </section>
  );
}
