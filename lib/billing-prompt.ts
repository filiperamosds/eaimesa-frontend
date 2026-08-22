import { shouldPromptSubscriptionPayment, trialMsRemaining, MS_PER_DAY } from "@eaimesa/shared";
import type { Venue } from "./types";

export type PaymentPrompt = {
  title: string;
  body: string;
  cta: string;
};

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
