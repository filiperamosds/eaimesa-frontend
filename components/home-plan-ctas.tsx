"use client";

import Link from "next/link";
import { catalogFallback } from "../lib/load-billing-plans";
import { useBillingPlans } from "../lib/use-billing-plans";
import { planCtaPrice } from "./plan-price";
import { PlanMarketingCards } from "./plan-cards";

export function HomePlanCtas() {
  const { plans, trialDays } = useBillingPlans();
  const listed = plans.length ? plans : catalogFallback().plans;

  return (
    <>
      <div className="mt-9 flex flex-col items-stretch gap-3 sm:max-w-lg">
        {listed.map((plan, i) => (
          <Link
            key={plan.id}
            href={`/cadastro?plano=${plan.id}`}
            className={i === 0 ? "btn-primary text-center" : "btn-secondary text-center"}
          >
            Adquirir {plan.name} · {planCtaPrice(plan)}
          </Link>
        ))}
      </div>
      <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
        {[
          [`${trialDays} dias`, "de trial"],
          ["0%", "comissão"],
          [`${listed.length} ${listed.length === 1 ? "plano" : "planos"}`, "agora"],
        ].map(([k, v]) => (
          <div key={v}>
            <dt className="font-serif text-2xl text-ink">{k}</dt>
            <dd className="text-ink-soft">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function LivePlanMarketingCards() {
  const { plans, trialDays } = useBillingPlans();
  const listed = plans.length ? plans : catalogFallback().plans;
  return <PlanMarketingCards plans={listed} trialDays={trialDays} />;
}
