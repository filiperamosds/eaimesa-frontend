"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  catalogFallback,
  type BillingPlan,
  type BillingPlansPayload,
} from "./load-billing-plans";

export function listedPlans(plans: BillingPlan[]): BillingPlan[] {
  return plans.filter((p) => p.listed !== false);
}

export function useBillingPlans() {
  const [payload, setPayload] = useState<BillingPlansPayload>(() => catalogFallback());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<BillingPlansPayload>("/v1/billing/plans")
      .then((data) => {
        if (cancelled) return;
        const listed = listedPlans(data.plans);
        setPayload({
          ...data,
          plans: listed.length ? listed : data.plans,
        });
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(() => listedPlans(payload.plans), [payload.plans]);

  return { plans, trialDays: payload.trialDays, loaded };
}
