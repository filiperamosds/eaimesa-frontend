export const PLAN_IDS = ["cardapio", "auto_atendimento"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_KINDS = ["cardapio", "auto_atendimento"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_FUTURE_ID = "equipamento" as const;
export const PLAN_CATALOG_MAX = 12;
export const PLAN_ID_MIN = 3;
export const PLAN_ID_MAX = 48;
export const PLAN_ID_REGEX = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export const TRIAL_DAYS = 7;
/** Últimos dias do trial em que o painel destaca o pagamento. */
export const TRIAL_ENDING_SOON_DAYS = 3;
export const PAID_PERIOD_DAYS = 30;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Tempo do stub no lugar do gateway — o front usa para o estado de loading. */
export const CHECKOUT_STUB_DELAY_MS = 2000;

export const PAYMENT_METHODS = ["card", "pix"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** `inline` = cartão no painel (Asaas). `hosted` = PIX na página do provedor. */
export const CHECKOUT_MODES = ["immediate", "hosted", "inline"] as const;
export type CheckoutMode = (typeof CHECKOUT_MODES)[number];

/** Máximo de cartões tokenizados por venue (API). */
export const SAVED_CARDS_MAX = 5;

export const CHECKOUT_RETURN = ["ok", "cancel", "expired"] as const;
export type CheckoutReturn = (typeof CHECKOUT_RETURN)[number];

/** Poll após `?checkout=ok` até `subscriptionStatus === "active"`. */
export const CHECKOUT_POLL_INTERVAL_MS = 3000;
export const CHECKOUT_POLL_TIMEOUT_MS = 120_000;

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; kind: PlanKind; priceCents: number; blurb: string; features: string[] }
> = {
  cardapio: {
    id: "cardapio",
    name: "Cardápio",
    kind: "cardapio",
    priceCents: 4900,
    blurb: "Cardápio público com a sua URL. Sem pedido no celular.",
    features: [
      "URL pública do cardápio",
      "Categorias, itens e foto",
      "Mesas e QR por mesa (até 15)",
      "1 estabelecimento",
    ],
  },
  auto_atendimento: {
    id: "auto_atendimento",
    name: "Auto atendimento",
    kind: "auto_atendimento",
    priceCents: 14900,
    blurb: "O cliente pede no celular. O garçom opera a fila.",
    features: [
      "Tudo do Cardápio",
      "Equipe (até 5) + QR do garçom + PIN",
      "Pedido, parcial e Kanban",
      "Estoque, receita e alerta de quantidade",
    ],
  },
};

export type PlanCatalogItem = {
  id: string;
  name: string;
  kind: PlanKind;
  priceCents: number;
  promoPriceCents: number | null;
  blurb: string;
  features: string[];
  listed: boolean;
  sortOrder: number;
};

export const PLAN_FUTURE = {
  id: PLAN_FUTURE_ID,
  name: "Equipamento na mesa",
  blurb: "Hardware/tablet na mesa. Em breve.",
};

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  cardapio: "Cardápio",
  auto_atendimento: "Auto atendimento",
};

export function isPlanId(value: string): value is PlanId {
  return value === "cardapio" || value === "auto_atendimento";
}

export function isPlanKind(value: string): value is PlanKind {
  return value === "cardapio" || value === "auto_atendimento";
}

/** Feature gate: pedido/garçom/equipe/Kanban. Aceita `kind` ou o id seed `auto_atendimento`. */
export function planAllowsService(planOrKind: string): boolean {
  return resolvePlanKind(planOrKind) === "auto_atendimento";
}

/** Cadastro de mesas + QR fixo — Cardápio e Auto atendimento (ADR-026). */
export function planAllowsTables(planOrKind: string): boolean {
  return isPlanKind(resolvePlanKind(planOrKind));
}

export function resolvePlanKind(planOrKind: string): PlanKind {
  if (isPlanKind(planOrKind)) return planOrKind;
  return "cardapio";
}

export function planRank(planOrKind: string): number {
  if (resolvePlanKind(planOrKind) === "auto_atendimento") return 2;
  if (resolvePlanKind(planOrKind) === "cardapio") return 1;
  return 0;
}

export function hasPromoPrice(plan: { priceCents: number; promoPriceCents?: number | null }): boolean {
  return (
    plan.promoPriceCents != null && plan.promoPriceCents >= 0 && plan.promoPriceCents < plan.priceCents
  );
}

export function effectivePriceCents(plan: { priceCents: number; promoPriceCents?: number | null }): number {
  return hasPromoPrice(plan) ? (plan.promoPriceCents as number) : plan.priceCents;
}

export function slugifyPlanId(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PLAN_ID_MAX);
  if (s.length >= PLAN_ID_MIN) return s;
  const padded = `${s || "plano"}-plan`.slice(0, PLAN_ID_MAX);
  return padded.length >= PLAN_ID_MIN ? padded : "plano-novo";
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Fim da cobertura ainda válida: o mais tarde entre agora, trial e vigência paga.
 * Datas no passado são ignoradas. Não há tabela de períodos — só essas datas no venue.
 */
export function coverageEndsAt(
  input: { trialEndsAt?: string | Date | null; currentPeriodEndsAt?: string | Date | null },
  now: Date = new Date(),
): Date {
  let end = now.getTime();
  const trial = toTime(input.trialEndsAt);
  const paid = toTime(input.currentPeriodEndsAt);
  if (trial != null && trial > end) end = trial;
  if (paid != null && paid > end) end = paid;
  return new Date(end);
}

/** Próximo vencimento após um pagamento: cobertura atual + `paidPeriodDays`. */
export function nextPaidPeriodEndsAt(
  input: { trialEndsAt?: string | Date | null; currentPeriodEndsAt?: string | Date | null },
  paidPeriodDays: number = PAID_PERIOD_DAYS,
  now: Date = new Date(),
): Date {
  return addDays(coverageEndsAt(input, now), paidPeriodDays);
}

export function trialMsRemaining(
  trialEndsAt: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (trialEndsAt == null) return null;
  const end = trialEndsAt instanceof Date ? trialEndsAt.getTime() : new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  return end - now.getTime();
}

/** `true` se o trial já venceu ou está dentro da janela de aviso. */
export function isTrialEndingSoon(
  trialEndsAt: string | Date | null | undefined,
  now: Date = new Date(),
  windowDays: number = TRIAL_ENDING_SOON_DAYS,
): boolean {
  const ms = trialMsRemaining(trialEndsAt, now);
  if (ms == null) return false;
  return ms <= windowDays * MS_PER_DAY;
}

/**
 * Quando o painel deve destacar `/painel/pagamento`.
 * `trial` só no fim da janela; `past_due` sempre. Pagamento antecipado continua em Configurações.
 */
export function shouldPromptSubscriptionPayment(
  input: { subscriptionStatus: string; trialEndsAt?: string | Date | null },
  now: Date = new Date(),
): boolean {
  if (input.subscriptionStatus === "past_due") return true;
  if (input.subscriptionStatus === "trial") return isTrialEndingSoon(input.trialEndsAt, now);
  return false;
}
