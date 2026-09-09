"use client";

import {
  DELIVERY_ORDER_STATUS_LABEL,
  formatBrlFromCents,
  isReservedSlug,
  PAY_ON_DELIVERY_LABEL,
} from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { DeliveryPublicOrder } from "../lib/types";
import { useDeliveryToken, useVenueSlug } from "../lib/venue-path";
import { OrderItemExtras } from "./order-item-extras";

const TOKEN_RE = /^[a-f0-9]{32}$/i;

export function DeliveryTrackPage() {
  const slug = useVenueSlug();
  const token = useDeliveryToken();
  const [order, setOrder] = useState<DeliveryPublicOrder | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug === undefined || token === undefined) return;
    if (!slug || isReservedSlug(slug) || !token || !TOKEN_RE.test(token)) {
      setOrder(null);
      setError("Pedido não encontrado.");
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await api<DeliveryPublicOrder>(
          `/v1/public/venues/${encodeURIComponent(slug!)}/delivery/orders/${encodeURIComponent(token!)}`,
        );
        if (cancelled) return;
        setOrder(data);
        setError(null);
        if (data.guestName) document.title = `Pedido · ${data.guestName}`;
      } catch (err) {
        if (cancelled) return;
        setOrder(null);
        setError(err instanceof ApiError ? err.message : "Pedido não encontrado.");
      }
    }
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [slug, token]);

  if (slug === undefined || token === undefined || order === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-ink-soft">Carregando pedido…</div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <h1 className="font-serif text-3xl">Pedido não encontrado</h1>
        <p className="mt-3 text-ink-soft">{error ?? "Confira o link que você recebeu."}</p>
        {slug ? (
          <Link href={`/${slug}/delivery`} className="btn-primary mt-6">
            Fazer um pedido
          </Link>
        ) : (
          <Link href="/" className="btn-primary mt-6">
            Início
          </Link>
        )}
      </div>
    );
  }

  const d = order.delivery;
  const status = DELIVERY_ORDER_STATUS_LABEL[order.status] ?? order.status;
  const pay = d ? PAY_ON_DELIVERY_LABEL[d.payOnDelivery] : null;

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 py-10">
      <p className="eyebrow">Delivery</p>
      <h1 className="mt-2 font-serif text-3xl">{status}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Guarde este link. Sem cadastro — quem tem a URL acompanha o pedido.
      </p>

      <section className="surface mt-6 p-4">
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.qty}× {i.name}
                {i.note ? <span className="text-ink-soft"> — {i.note}</span> : null}
                <OrderItemExtras modifiers={i.modifiers} />
              </span>
              <span className="tabular-nums">{formatBrlFromCents(i.unitPriceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        {order.note ? <p className="mt-3 text-sm text-ink-soft">{order.note}</p> : null}
        {d && d.feeCents > 0 ? (
          <p className="mt-3 flex justify-between text-sm">
            <span>Entrega</span>
            <span className="tabular-nums">{formatBrlFromCents(d.feeCents)}</span>
          </p>
        ) : null}
        <p className="mt-3 flex justify-between font-medium">
          <span>Total</span>
          <span className="tabular-nums text-chili">{formatBrlFromCents(order.totalCents)}</span>
        </p>
      </section>

      {d ? (
        <section className="mt-6 space-y-1 text-sm">
          <p className="font-medium">{d.customerName}</p>
          <p className="text-ink-soft">{d.phoneMasked}</p>
          <p>
            {d.address.street}, {d.address.number}
            {d.address.complement ? ` — ${d.address.complement}` : ""}
          </p>
          <p className="text-ink-soft">
            {d.address.neighborhood}
            {d.address.city ? ` · ${d.address.city}` : ""}
            {d.address.state ? `/${d.address.state}` : ""}
            {d.address.postalCode ? ` · ${d.address.postalCode}` : ""}
          </p>
          {pay ? <p className="mt-2">Pagar na entrega: {pay}</p> : null}
        </section>
      ) : null}

      {slug ? (
        <p className="mt-10 text-center text-sm">
          <Link href={`/${slug}/delivery`} className="text-chili underline decoration-chili/40">
            Pedir de novo
          </Link>
        </p>
      ) : null}
    </div>
  );
}
