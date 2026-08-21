"use client";

import Link from "next/link";
import { useGuestTab } from "../lib/use-guest-tab";
import { useVenueSlug } from "../lib/venue-path";
import { useGuestOrders } from "../lib/use-guest-orders";
import { GuestPartial } from "./guest-partial";
import { OpenComandaForm } from "./open-comanda-form";
import { TablePinReveal } from "./table-pin";

export function ComandaProfileView() {
  const slug = useVenueSlug();
  const tab = useGuestTab(slug ?? "");
  const hasTab = Boolean(tab && !tab.needsProfile);
  const { orders, totalCents, error } = useGuestOrders(hasTab);

  if (!slug) return null;

  if (tab === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center text-ink-soft">Carregando comanda…</div>
    );
  }

  if (tab && !tab.needsProfile) {
    return (
      <div className="mx-auto max-w-lg px-5 py-12">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Sua comanda</p>
            <h1 className="mt-2 font-serif text-3xl">{tab.guestName}</h1>
            <p className="mt-1 text-ink-soft">{tab.tableLabel}</p>
          </div>
          <TablePinReveal pin={tab.pinDisplay} tableLabel={tab.tableLabel} />
        </div>
        {error ? <p className="mt-4 text-sm text-chili">{error}</p> : null}
        <div className="surface mt-6 p-5">
          <GuestPartial orders={orders} totalCents={totalCents} />
        </div>
        <Link href={`/${slug}`} className="btn-primary mt-6 inline-flex !py-2 text-sm">
          Pedir mais no cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <div className="relative">
        {tab?.pinDisplay ? (
          <div className="absolute right-0 top-0 text-ink-soft">
            <TablePinReveal pin={tab.pinDisplay} tableLabel={tab.tableLabel} />
          </div>
        ) : null}
        <p className="eyebrow">Sua comanda</p>
        <h1 className="mt-2 font-serif text-3xl">Nome e telefone</h1>
      </div>
      <p className="mt-3 text-ink-soft">
        Cada pessoa na mesa tem a própria conta. O mesmo telefone não pode ter duas comandas abertas.
      </p>
      {tab === null ? (
        <p className="mt-6 text-sm text-ink-soft">
          Entre na mesa com o QR do garçom ou o{" "}
          <Link href={`/${slug}/entrar`} className="font-medium text-chili underline">
            PIN
          </Link>{" "}
          para abrir sua comanda.
        </p>
      ) : (
        <OpenComandaForm slug={slug} />
      )}
      <Link href={`/${slug}`} className="btn-ghost mt-6 inline-flex">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
