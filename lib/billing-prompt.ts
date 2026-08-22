import {
  coverageEndsAt,
  nextPaidPeriodEndsAt,
  shouldPromptSubscriptionPayment,
  trialMsRemaining,
  MS_PER_DAY,
} from "@eaimesa/shared";
import type { Venue } from "./types";

export type PaymentPrompt = {
  title: string;
  body: string;
  cta: string;
};

function formatPtDate(value: Date): string {
  return value.toLocaleDateString("pt-BR");
}

export function stackedPeriodCopy(
  venue: Pick<Venue, "trialEndsAt" | "currentPeriodEndsAt">,
  paidPeriodDays: number,
  now: Date = new Date(),
): { leftoverUntil: string | null; until: string; text: string } {
  const leftover = coverageEndsAt(venue, now);
  const untilDate = nextPaidPeriodEndsAt(venue, paidPeriodDays, now);
  const until = formatPtDate(untilDate);
  const leftoverUntil = leftover.getTime() > now.getTime() + 60_000 ? formatPtDate(leftover) : null;
  const text = leftoverUntil
    ? `Os dias que ainda restam (até ${leftoverUntil}) entram na vigência. Se pagar agora, o plano vai até ${until}.`
    : `A vigência de ${paidPeriodDays} dias começa agora e vai até ${until}.`;
  return { leftoverUntil, until, text };
}

export function paymentPromptForVenue(
  venue: Pick<Venue, "subscriptionStatus" | "trialEndsAt">,
  now: Date = new Date(),
): PaymentPrompt | null {
  if (!shouldPromptSubscriptionPayment(venue, now)) return null;

  if (venue.subscriptionStatus === "past_due") {
    return {
      title: "Assinatura em atraso",
      body: "Pague para continuar usando o plano. O cardápio público segue visível.",
      cta: "Pagar agora",
    };
  }

  const ms = trialMsRemaining(venue.trialEndsAt, now);
  if (ms == null || ms <= 0) {
    return {
      title: "O trial acabou",
      body: "Pague para continuar com o plano. Sem pagamento, os recursos ficam bloqueados.",
      cta: "Pagar agora",
    };
  }

  const wholeDays = Math.floor(ms / MS_PER_DAY);
  const title =
    wholeDays <= 0 ? "O trial acaba hoje" : wholeDays === 1 ? "O trial acaba amanhã" : `O trial acaba em ${wholeDays} dias`;

  return {
    title,
    body: "Pague agora para não perder o plano quando o período de teste terminar.",
    cta: "Pagar agora",
  };
}
