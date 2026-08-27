"use client";

import { useCallback, useEffect, useState } from "react";
import { serviceFeeCents, tabDueCents, tabPartialCents } from "@eaimesa/shared";
import { api, ApiError } from "./api";
import type { GuestOrder, GuestOrdersPayload } from "./types";

export function useGuestOrders(enabled: boolean) {
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [serviceFeePercent, setServiceFeePercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setOrders([]);
      setServiceFeePercent(0);
      return;
    }
    try {
      const data = await api<GuestOrdersPayload>("/v1/guest/orders");
      setOrders(data.orders);
      setServiceFeePercent(data.serviceFeePercent ?? 0);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 409)) {
        setOrders([]);
        setServiceFeePercent(0);
        setError(null);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar a comanda.");
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    if (!enabled) return;
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  const subtotalCents = tabPartialCents(orders);
  const feeCents = serviceFeeCents(subtotalCents, serviceFeePercent);

  return {
    orders,
    subtotalCents,
    serviceFeePercent,
    serviceFeeCents: feeCents,
    dueCents: tabDueCents(subtotalCents, serviceFeePercent),
    totalCents: tabDueCents(subtotalCents, serviceFeePercent),
    error,
    reload: load,
  };
}
