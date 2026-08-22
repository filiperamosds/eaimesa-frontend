"use client";

import {
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_POLL_TIMEOUT_MS,
  formatBrlFromCents,
  PAID_PERIOD_DAYS,
  PLAN_FUTURE,
  planRank,
  type CheckoutMode,
  type CheckoutPayer,
  type PaymentMethod,
} from "@eaimesa/shared";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { stackedPeriodCopy } from "../lib/billing-prompt";
import type { BillingGateway, PendingCheckout } from "../lib/load-billing-plans";
import type { Session, Venue } from "../lib/types";
import { PaymentForm } from "./payment-form";
import { PlanPrice, planCtaPrice } from "./plan-price";

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
  plans: BillingPlanRow[];
  gateway?: BillingGateway;
  pendingCheckout?: PendingCheckout | null;
  paidPeriodDays?: number;
};

type CheckoutResult = {
  status: "success" | "pending";
  provider: string;
  method?: string;
  plan: string;
  planName: string;
  amountCents: number;
  subscriptionStatus: string;
  currentPeriodEndsAt?: string | null;
  checkoutUrl?: string | null;
  message: string;
};

type NoticeKind = "waiting" | "confirmed" | "cancel" | "expired";

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
  return {
    provider: g.provider || FALLBACK_GATEWAY.provider,
    checkoutMode: g.checkoutMode === "hosted" ? "hosted" : "immediate",
    methods: methods.length ? methods : FALLBACK_GATEWAY.methods,
    requiresPayer: Boolean(g.requiresPayer),
    available: g.available !== false,
  };
}

function checkoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir o pagamento.";
}

function stripCheckoutQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
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
        const openId =
          fromQuery ??
          (onPagamento
            ? (me.plans.some((p) => p.id === me.venue.plan) ? me.venue.plan : (me.plans[0]?.id ?? null))
            : null);
        if (openId) setCheckoutPlan(openId);

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

  async function pay(plan: string, method: PaymentMethod, payer?: CheckoutPayer) {
    const gateway = resolveGateway(data);
    if (!gateway.available) {
      setError("Pagamento indisponível no momento.");
      return;
    }
    setError(null);
    setSuccess(null);
    setNotice(null);
    setPending(true);
    try {
      const body: { plan: string; method: PaymentMethod; payer?: CheckoutPayer } = { plan, method };
      if (payer) body.payer = payer;
      const result = await api<CheckoutResult>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (result.status === "pending" && result.checkoutUrl) {
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
  const payDisabled = pending || polling || !gateway.available;
  const paidDays = data.paidPeriodDays ?? PAID_PERIOD_DAYS;
  const stacked = stackedPeriodCopy(data.venue, paidDays);
  const noticeClass =
    notice?.kind === "confirmed"
      ? "border-sage/40 bg-sage/10"
      : notice?.kind === "waiting"
        ? "border-line bg-paper-2/60"
        : "border-chili/30 bg-chili/5";

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <p className="eyebrow">Plano</p>
        <h2 className="mt-2 font-serif text-2xl">{data.venue.planName ?? current}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Status: {data.venue.subscriptionStatus}
          {data.venue.subscriptionStatus === "trial" && data.venue.trialEndsAt
            ? ` · trial até ${new Date(data.venue.trialEndsAt).toLocaleDateString("pt-BR")}`
            : null}
          {data.venue.currentPeriodEndsAt
            ? ` · vigência até ${new Date(data.venue.currentPeriodEndsAt).toLocaleDateString("pt-BR")}`
            : null}
        </p>
        {!data.entitlement.ok ? (
          <p className="mt-3 text-sm text-chili">{data.entitlement.message}</p>
        ) : null}
      </div>

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
            Continue na página do provedor. O plano só fica ativo depois da confirmação.
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
            {success.planName} · {formatBrlFromCents(success.amountCents)}
            {success.method ? ` · ${success.method === "pix" ? "PIX" : "cartão"}` : null}
            {success.provider ? ` · ${success.provider}` : null}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{success.message}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      {selected ? (
        <PaymentForm
          planName={selected.name}
          amountCents={selected.effectivePriceCents ?? selected.priceCents}
          listPriceCents={selected.priceCents}
          promoPriceCents={selected.promoPriceCents}
          pending={pending}
          checkoutMode={checkoutMode}
          requiresPayer={gateway.requiresPayer}
          methods={gateway.methods}
          defaultEmail={accountEmail}
          provider={gateway.provider}
          coverageNote={stacked.text}
          onCancel={() => {
            if (!pending) setCheckoutPlan(null);
          }}
          onPay={(method, payer) => void pay(selected.id, method, payer)}
        />
      ) : (
        <div className={`grid gap-3 ${cols}`}>
          {data.plans.map((p) => {
            const isCurrent = p.id === current;
            const rank = planRank(p.kind ?? p.id);
            const currentRank = planRank(currentKind);
            const upgrade = !isCurrent && rank > currentRank;
            const downgrade = !isCurrent && rank < currentRank;
            const lateral = !isCurrent && rank === currentRank;
            const locked = downgrade && !data.canDowngrade;
            const enabled = isCurrent || upgrade || lateral || (downgrade && data.canDowngrade);
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
                <p className="mt-2 text-sm text-ink-soft">{p.blurb}</p>
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  {p.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!enabled || payDisabled}
                  onClick={() => {
                    setSuccess(null);
                    setError(null);
                    setCheckoutPlan(p.id);
                  }}
                  className="btn-primary mt-4 !py-2 text-sm disabled:opacity-50"
                >
                  {isCurrent
                    ? `Pagar ${planCtaPrice(p)}`
                    : upgrade
                      ? `Subir · ${planCtaPrice(p)}`
                      : lateral
                        ? `Trocar · ${planCtaPrice(p)}`
                        : locked
                          ? "Disponível no fim da vigência"
                          : `Descer · ${planCtaPrice(p)}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-ink-soft">
        {PLAN_FUTURE.name}: {PLAN_FUTURE.blurb}{" "}
        {hosted
          ? "Cartão e PIX são cobrados na página do provedor. O Asaas guarda o cartão na assinatura mensal. O EaiMesa não envia PAN, CVV nem token."
          : "O POST leva plano e meio (cartão ou PIX). Número, validade e CVV não entram na API."}
      </p>
    </section>
  );
}
