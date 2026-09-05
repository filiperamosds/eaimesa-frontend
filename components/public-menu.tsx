"use client";

import { formatBrlFromCents, planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GuestCart, type CartLine } from "./guest-cart";
import { GuestPartialDialog } from "./guest-partial-dialog";
import { GuestTabBar } from "./guest-tab-bar";
import { GuestWaiterCallBar } from "./guest-waiter-call-bar";
import { mediaSrc } from "../lib/media";
import { useGuestOrders } from "../lib/use-guest-orders";
import { useGuestTab } from "../lib/use-guest-tab";
import { useWaiterPresence } from "../lib/use-waiter-presence";
import type { PublicMenu } from "../lib/types";

type MenuItem = PublicMenu["categories"][number]["items"][number];

function itemsWithPromo(groups: PublicMenu["categories"], promo: "offer" | "happy_hour"): MenuItem[] {
  const seen = new Set<string>();
  const list: MenuItem[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      if (item.promo !== promo || seen.has(item.id)) continue;
      if ((item.listPriceCents ?? item.priceCents) <= item.priceCents) continue;
      seen.add(item.id);
      list.push(item);
    }
  }
  return list;
}

export function PublicMenuView({ menu }: { menu: PublicMenu }) {
  const groups = menu.categories.filter((c) => c.items.length > 0);
  const offers = useMemo(() => itemsWithPromo(groups, "offer"), [groups]);
  const happyHour = useMemo(() => itemsWithPromo(groups, "happy_hour"), [groups]);
  const tabs = useMemo(() => {
    const next = [
      ...(offers.length > 0 ? [{ id: "__offers", name: "Ofertas", items: offers }] : []),
      ...(happyHour.length > 0 ? [{ id: "__happy_hour", name: "Happy hour", items: happyHour }] : []),
    ];
    return [...next, ...groups.map((g) => ({ id: g.id, name: g.name, items: g.items }))];
  }, [groups, offers, happyHour]);
  const [tabId, setTabId] = useState<string | null>(null);
  const active = tabs.find((t) => t.id === (tabId && tabs.some((x) => x.id === tabId) ? tabId : tabs[0]?.id)) ?? tabs[0];
  const [openId, setOpenId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [partialOpen, setPartialOpen] = useState(false);
  const ordering =
    planAllowsService(menu.venue.planKind ?? menu.venue.plan ?? "") && Boolean(menu.venue.acceptsOrders);
  const tab = useGuestTab(menu.venue.slug, ordering);
  const suspended = menu.venue.subscriptionStatus === "suspended";
  const canOrder = Boolean(ordering && tab && !tab.needsProfile && !suspended);
  const hasTab = Boolean(ordering && tab && !tab.needsProfile);
  const {
    orders,
    totalCents,
    subtotalCents,
    serviceFeePercent,
    serviceFeeCents,
    error: ordersError,
    reload,
  } = useGuestOrders(hasTab);
  /**
   * Chamar garçom: não depende mais de “não ser Auto atendimento”.
   * Liga com waiterCallEnabled=true no payload público; no Cardápio, undefined ainda tenta (?mesa=).
   */
  const servicePlan = planAllowsService(menu.venue.planKind ?? menu.venue.plan ?? "");
  const flag = menu.venue.waiterCallEnabled;
  const waiterFeatureOn = flag === true || (flag !== false && !servicePlan);
  const waiterEnabled = !suspended && waiterFeatureOn && (!ordering || tab === null);
  const waiter = useWaiterPresence(menu.venue.slug, waiterEnabled);

  useEffect(() => {
    const on = Boolean(menu.venue.catalogDark);
    document.documentElement.classList.toggle("catalog-dark", on);
    return () => document.documentElement.classList.remove("catalog-dark");
  }, [menu.venue.catalogDark]);

  function addItem(item: PublicMenu["categories"][number]["items"][number]) {
    setCart((cur) => {
      const existing = cur.find((l) => l.catalogItemId === item.id);
      if (existing) {
        return cur.map((l) =>
          l.catalogItemId === item.id ? { ...l, qty: Math.min(99, l.qty + 1) } : l,
        );
      }
      return [
        ...cur,
        {
          catalogItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          qty: 1,
          note: "",
          maxNoteLength: item.maxNoteLength ?? 80,
        },
      ];
    });
  }

  const qtyOf = (id: string) => cart.find((l) => l.catalogItemId === id)?.qty ?? 0;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-night text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(226,60,20,0.35),transparent_45%)]" />
        <div className="relative mx-auto max-w-lg px-5 py-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/50">Cardápio</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{menu.venue.name}</h1>
          {suspended ? (
            <p className="mt-4 text-sm text-amber">Assinatura inativa — só leitura.</p>
          ) : canOrder ? (
            <p className="mt-4 text-sm text-white/65">Toque em adicionar e envie o pedido pela cesta.</p>
          ) : ordering ? (
            <p className="mt-4 text-sm text-white/65">
              Cardápio só leitura até entrar na mesa. Peça o QR do garçom ou use o PIN.
            </p>
          ) : waiter.presence ? (
            <p className="mt-4 text-sm text-white/65">
              Precisa de ajuda? Chame o garçom pela faixa abaixo.
            </p>
          ) : null}
        </div>
      </header>
      {ordering ? (
        <GuestTabBar
          slug={menu.venue.slug}
          tab={tab}
          partialCents={totalCents}
          showJoin
          onOpenPartial={hasTab ? () => setPartialOpen(true) : undefined}
        />
      ) : null}
      {waiterEnabled ? (
        <GuestWaiterCallBar
          presence={waiter.presence}
          mesaStored={waiter.mesaStored}
          loadError={waiter.loadError}
          featureHint={flag === true}
          calling={waiter.calling}
          callMsg={waiter.callMsg}
          callError={waiter.callError}
          onCall={() => void waiter.callWaiter()}
        />
      ) : null}

      {tabs.length > 0 ? (
        <nav
          className="sticky top-0 z-20 border-b border-line/80 bg-paper/80 backdrop-blur-xl"
          aria-label="Categorias do cardápio"
        >
          <ul className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const selected = active?.id === t.id;
              return (
                <li key={t.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTabId(t.id);
                      setOpenId(null);
                    }}
                    className={`inline-block rounded-full border px-3.5 py-1.5 text-sm shadow-sm ${
                      selected
                        ? "border-chili bg-chili text-white"
                        : "border-line bg-card text-ink hover:border-chili/40 hover:text-chili"
                    }`}
                  >
                    {t.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <main className={`mx-auto max-w-lg px-5 pb-16 pt-8 ${cart.length > 0 || orders.length > 0 ? "pb-28" : ""}`}>
        {!active ? (
          <p className="py-16 text-center text-ink-soft">Cardápio em montagem.</p>
        ) : (
          <section>
            <div className="mb-4 flex items-end gap-3">
              <h2 className="font-serif text-2xl">{active.name}</h2>
              <span className="mb-1 h-px flex-1 bg-line" />
              <span className="mb-0.5 text-[11px] uppercase tracking-wider text-ink-soft">
                {active.items.length} {active.items.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <ul className="space-y-3">
              {active.items.map((item) => {
                const photo = mediaSrc(item.imageUrl);
                const expandable = Boolean(item.description || photo);
                const open = openId === item.id;
                const qty = qtyOf(item.id);
                const onPromo = Boolean(
                  item.promo && item.listPriceCents && item.listPriceCents > item.priceCents,
                );
                return (
                  <li key={item.id} className="surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        if (!expandable) return;
                        setOpenId((cur) => (cur === item.id ? null : item.id));
                      }}
                      disabled={!expandable}
                      aria-expanded={expandable ? open : undefined}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:cursor-default"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <span className="h-16 w-16 shrink-0 rounded-2xl bg-paper-2" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium leading-snug">{item.name}</span>
                          <span className="shrink-0 text-right">
                            {onPromo ? (
                              <span className="mr-2 text-xs tabular-nums text-ink-soft line-through">
                                {formatBrlFromCents(item.listPriceCents!)}
                              </span>
                            ) : null}
                            <span className="font-medium tabular-nums text-chili">
                              {formatBrlFromCents(item.priceCents)}
                            </span>
                          </span>
                        </span>
                        {onPromo ? (
                          <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-chili">
                            {item.promo === "happy_hour" ? "Happy hour" : "Oferta"}
                          </span>
                        ) : null}
                        {!open && item.description ? (
                          <span className="mt-0.5 line-clamp-1 block text-sm text-ink-soft">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                      {expandable && open ? (
                        <div className="space-y-3 px-3 pb-2">
                          {photo ? (
                            <img
                              src={photo}
                              alt={item.name}
                              className="max-h-72 w-full rounded-2xl object-cover"
                            />
                          ) : null}
                          {item.description ? (
                            <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {ordering && !suspended ? (
                        <div className="flex justify-end px-3 pb-3">
                          {canOrder ? (
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className="btn-primary !px-3 !py-1.5 text-sm"
                            >
                              {qty > 0 ? `Adicionar · ${qty}` : "Adicionar"}
                            </button>
                          ) : tab?.needsProfile ? (
                            <Link href={`/${menu.venue.slug}/comanda`} className="btn-primary !px-3 !py-1.5 text-sm">
                              Abrir comanda
                            </Link>
                          ) : (
                            <Link href={`/${menu.venue.slug}/entrar`} className="btn-primary !px-3 !py-1.5 text-sm">
                              Entrar para pedir
                            </Link>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
        )}
      </main>

      {ordering ? (
        <GuestCart
          cart={cart}
          onChange={setCart}
          canOrder={canOrder}
          orders={orders}
          partialCents={totalCents}
          subtotalCents={subtotalCents}
          serviceFeePercent={serviceFeePercent}
          serviceFeeCents={serviceFeeCents}
          onOrdered={() => void reload()}
        />
      ) : null}

      {partialOpen && tab && !tab.needsProfile ? (
        <GuestPartialDialog
          guestName={tab.guestName ?? "Sua comanda"}
          tableLabel={tab.tableLabel}
          orders={orders}
          totalCents={subtotalCents}
          serviceFeePercent={serviceFeePercent}
          serviceFeeCents={serviceFeeCents}
          error={ordersError}
          onClose={() => setPartialOpen(false)}
        />
      ) : null}

      <footer className="pb-10 text-center text-xs text-ink-soft">
        Cardápio por{" "}
        <Link href="/" className="font-medium text-ink underline decoration-chili/40">
          EaiMesa
        </Link>
      </footer>
    </div>
  );
}
