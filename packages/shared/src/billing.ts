import { formatBrlFromCents } from "./money";

export type SavedCard = {
  id: string;
  last4: string;
  brand?: string | null;
  isDefault?: boolean;
};

/** Cartão default em `/me` (compat). `id` pode faltar no legado. */
export type BillingSavedCard = {
  id?: string;
  last4: string;
  brand?: string | null;
};

export type UpgradeQuote = {
  plan: string;
  planName: string;
  listPriceCents: number;
  creditCents: number;
  amountCents: number;
  recurringAmountCents: number;
  isUpgrade: boolean;
};

export type ScheduledDowngrade = {
  plan: string;
  planName?: string | null;
  at: string;
};

export type SubscriptionCancellation = {
  canceledAt: string;
  accessUntil: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSavedCardId(id: string | undefined | null): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

export function cardLast4(last4: string): string {
  const digits = last4.replace(/\D/g, "").slice(-4);
  return digits.length === 4 ? digits : last4.replace(/\s/g, "").slice(-4);
}

/** UI: `**** 4156` e, se houver, a bandeira. */
export function formatSavedCardLabel(card: { last4: string; brand?: string | null }): string {
  const masked = `**** ${cardLast4(card.last4)}`;
  const brand = (card.brand ?? "").trim();
  return brand ? `${brand} ${masked}` : masked;
}

/** Copy de upgrade com prorrata (ADR-028). */
export function upgradeQuoteLine(
  quote: Pick<UpgradeQuote, "amountCents" | "creditCents" | "recurringAmountCents" | "isUpgrade">,
): string {
  const today = formatBrlFromCents(quote.amountCents);
  const later = formatBrlFromCents(quote.recurringAmountCents);
  if (!quote.isUpgrade) return `${later}/mês`;
  if (quote.creditCents > 0) {
    return `hoje ${today} (crédito ${formatBrlFromCents(quote.creditCents)}) · depois ${later}/mês`;
  }
  return `hoje ${today} · depois ${later}/mês`;
}

export function isPaidPeriodOpen(
  venue: { subscriptionStatus: string; currentPeriodEndsAt?: string | Date | null },
  now: Date = new Date(),
): boolean {
  if (venue.subscriptionStatus !== "active") return false;
  if (venue.currentPeriodEndsAt == null) return false;
  const t =
    venue.currentPeriodEndsAt instanceof Date
      ? venue.currentPeriodEndsAt.getTime()
      : new Date(venue.currentPeriodEndsAt).getTime();
  return !Number.isNaN(t) && t > now.getTime();
}
