"use client";

import { formatBrlFromCents, isReservedSlug, itemNeedsModifierPicker } from "@eaimesa/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { makeCartLine, qtyOfItem, upsertCartLine, type CartLine } from "../lib/cart-line";
import { loadPublicMenu, venueAllowsDelivery } from "../lib/load-public-menu";
import { mediaSrc } from "../lib/media";
import type { PublicMenu } from "../lib/types";
import { useVenueSlug } from "../lib/venue-path";
import { DeliveryCheckout } from "./delivery-checkout";
import { ItemModifiersDialog } from "./item-modifiers-dialog";
import { OrderItemExtras } from "./order-item-extras";
import { Logo } from "./site-chrome";

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

function itemOnPromo(item: MenuItem): boolean {
  return Boolean(item.promo && item.listPriceCents && item.listPriceCents > item.priceCents);
}

function itemBadge(item: MenuItem): string | null {
  if (!itemOnPromo(item) || !item.listPriceCents) return null;
  if (item.promo === "happy_hour") return "Happy hour";
  const save = item.listPriceCents - item.priceCents;
  return save > 0 ? `Economize ${formatBrlFromCents(save)}` : "Oferta";
}

function matchesQuery(item: MenuItem, q: string): boolean {
  if (!q) return true;
  const hay = `${item.name} ${item.description ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export function DeliveryMenuPage() {
  const slug = useVenueSlug();
  const [menu, setMenu] = useState<PublicMenu | null | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (slug === undefined) return;
    if (!slug || isReservedSlug(slug)) {
      setMenu(null);
      return;
    }
    let cancelled = false;
    setUnavailable(false);
    setMenu(undefined);
    loadPublicMenu(slug)
      .then((m) => {
        if (cancelled) return;
        setMenu(m);
        if (m) document.title = `Delivery · ${m.venue.name}`;
      })
      .catch(() => {
        if (!cancelled) {
          setUnavailable(true);
          setMenu(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (unavailable) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-ink-soft">Cardápio temporariamente indisponível. Tente de novo em instantes.</p>
      </div>
    );
  }

  if (slug === undefined || menu === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-ink-soft">Carregando…</div>
    );
  }

  if (!menu) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-serif text-3xl">Cardápio não encontrado</h1>
        <Link href="/" className="btn-primary mt-6">
          Ir para o início
        </Link>
      </div>
    );
  }

  if (!venueAllowsDelivery(menu)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <h1 className="font-serif text-3xl">{menu.venue.name}</h1>
        <p className="mt-3 text-ink-soft">Este estabelecimento não está aceitando delivery agora.</p>
        <Link href={`/${menu.venue.slug}`} className="btn-primary mt-6">
          Ver cardápio
        </Link>
      </div>
    );
  }

  return <DeliveryMenuView menu={menu} />;
}

function DeliveryMenuView({ menu }: { menu: PublicMenu }) {
  const router = useRouter();
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
  const [picker, setPicker] = useState<MenuItem | null>(null);
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState("");
  const feeCents = menu.venue.delivery?.feeCents ?? 0;
  const eta = menu.venue.delivery?.etaMinutes;
  const cartCents = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const q = query.trim().toLowerCase();
  const searching = q.length >= 2;
  const visibleItems = useMemo(() => {
    if (!searching) return active?.items ?? [];
    const seen = new Set<string>();
    const out: MenuItem[] = [];
    for (const tab of tabs) {
      for (const item of tab.items) {
        if (seen.has(item.id) || !matchesQuery(item, q)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }, [searching, active, tabs, q]);
  const sectionTitle = searching ? "Resultados" : (active?.name ?? "Cardápio");
  const promoTab = happyHour.length > 0 ? "__happy_hour" : offers.length > 0 ? "__offers" : null;

  useEffect(() => {
    const on = Boolean(menu.venue.catalogDark);
    document.documentElement.classList.toggle("catalog-dark", on);
    return () => document.documentElement.classList.remove("catalog-dark");
  }, [menu.venue.catalogDark]);

  function addItem(item: MenuItem) {
    if (itemNeedsModifierPicker(item.modifierGroups)) {
      setPicker(item);
      return;
    }
    setCart((cur) => upsertCartLine(cur, makeCartLine(item)));
  }

  function setQty(key: string, qty: number) {
    if (qty <= 0) {
      setCart((cur) => cur.filter((l) => l.key !== key));
      return;
    }
    setCart((cur) => cur.map((l) => (l.key === key ? { ...l, qty } : l)));
  }

  const qtyOf = (id: string) => qtyOfItem(cart, id);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo className="shrink-0" href={`/${menu.venue.slug}/delivery`} />
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar no cardápio</span>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              className="field !rounded-full !py-2 pl-9 pr-3 text-sm"
              placeholder="Buscar no cardápio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-card text-ink lg:hidden"
            onClick={() => count > 0 && setSheet(true)}
            aria-label={count > 0 ? `Ver pedido, ${count} itens` : "Pedido vazio"}
          >
            <BagIcon />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-chili px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_19.5rem] lg:items-start">
        <div className={count > 0 ? "pb-24 lg:pb-8" : "pb-8"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-chili">Delivery</p>
              <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">{menu.venue.name}</h1>
              <p className="mt-1 text-sm text-ink-soft">Peça pelo celular. Pagamento na entrega.</p>
            </div>
            <span className="rounded-full bg-sage-soft px-3 py-1 text-sm font-medium text-sage">Delivery</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {eta ? (
              <span className="rounded-full border border-line bg-card px-3 py-1.5 text-sm">{eta} min</span>
            ) : null}
            <span className="rounded-full border border-line bg-card px-3 py-1.5 text-sm">
              {feeCents > 0 ? `Entrega ${formatBrlFromCents(feeCents)}` : "Entrega grátis"}
            </span>
            <Link
              href={`/${menu.venue.slug}`}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink-soft hover:text-chili"
            >
              Cardápio da mesa
            </Link>
          </div>

          {promoTab ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTabId(promoTab);
                setOpenId(null);
              }}
              className="relative mt-5 w-full overflow-hidden rounded-2xl bg-chili px-5 py-4 text-left text-white"
            >
              <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" aria-hidden />
              <span className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" aria-hidden />
              <span className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                {promoTab === "__happy_hour" ? "Happy hour" : "Ofertas"}
              </span>
              <span className="relative mt-1 block font-serif text-xl leading-snug">
                {promoTab === "__happy_hour"
                  ? "Preços especiais agora no cardápio"
                  : "Itens com preço reduzido no cardápio"}
              </span>
            </button>
          ) : null}

          {tabs.length > 0 && !searching ? (
            <nav className="sticky top-[3.65rem] z-20 -mx-4 mt-5 bg-paper/90 px-4 py-3 backdrop-blur-xl" aria-label="Categorias do cardápio">
              <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                        className={`rounded-full px-3.5 py-1.5 text-sm ${
                          selected
                            ? "bg-ink text-card"
                            : "border border-line bg-card text-ink hover:border-chili/40"
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

          {!active && !searching ? (
            <p className="py-16 text-center text-ink-soft">Cardápio em montagem.</p>
          ) : (
            <section className="mt-4">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-2xl">{sectionTitle}</h2>
                <span className="text-sm text-ink-soft">
                  {visibleItems.length} {visibleItems.length === 1 ? "item" : "itens"}
                </span>
              </div>
              {visibleItems.length === 0 ? (
                <p className="py-12 text-center text-ink-soft">
                  {searching ? "Nada encontrado com essa busca." : "Nenhum item nesta categoria."}
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {visibleItems.map((item) => (
                    <li key={item.id}>
                      <DeliveryItemCard
                        item={item}
                        qty={qtyOf(item.id)}
                        open={openId === item.id}
                        onToggle={() =>
                          setOpenId((cur) => (cur === item.id ? null : item.id))
                        }
                        onAdd={() => addItem(item)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <DeliveryCartPanel
            cart={cart}
            feeCents={feeCents}
            cartCents={cartCents}
            count={count}
            onQty={setQty}
            onContinue={() => setSheet(true)}
          />
        </aside>
      </div>

      {count > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-full bg-chili px-5 py-3.5 text-sm font-medium text-white shadow-lg shadow-chili/30"
            onClick={() => setSheet(true)}
          >
            <span>
              {count} {count === 1 ? "item" : "itens"}
            </span>
            <span>
              Ver pedido · {formatBrlFromCents(cartCents + feeCents)}
            </span>
          </button>
        </div>
      ) : null}

      {sheet ? (
        <DeliveryCheckout
          slug={menu.venue.slug}
          cart={cart}
          onChange={setCart}
          feeCents={feeCents}
          onClose={() => setSheet(false)}
          onPlaced={(path) => router.push(path.endsWith("/") ? path : `${path}/`)}
        />
      ) : null}

      {picker ? (
        <ItemModifiersDialog
          item={picker}
          onConfirm={(ids) => {
            setCart((cur) => upsertCartLine(cur, makeCartLine(picker, ids)));
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
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

function DeliveryItemCard({
  item,
  qty,
  open,
  onToggle,
  onAdd,
}: {
  item: MenuItem;
  qty: number;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  const photo = mediaSrc(item.imageUrl);
  const expandable = Boolean(item.description || photo);
  const badge = itemBadge(item);
  const onPromo = itemOnPromo(item);

  return (
    <article className="surface flex min-h-36 overflow-hidden p-0 shadow-sm">
      <button
        type="button"
        onClick={() => {
          if (!expandable) return;
          onToggle();
        }}
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        className="flex min-h-36 min-w-0 flex-1 flex-col px-4 py-3.5 text-left disabled:cursor-default"
      >
        {badge ? (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-chili">{badge}</span>
        ) : null}
        <span className="mt-0.5 font-semibold leading-snug">{item.name}</span>
        {item.description ? (
          <span className={`mt-1 text-sm leading-snug text-ink-soft ${open ? "" : "line-clamp-2"}`}>
            {item.description}
          </span>
        ) : null}
        <span className="mt-auto pt-2">
          {onPromo ? (
            <span className="mr-2 text-xs tabular-nums text-ink-soft line-through">
              {formatBrlFromCents(item.listPriceCents!)}
            </span>
          ) : null}
          <span className="font-semibold tabular-nums">{formatBrlFromCents(item.priceCents)}</span>
        </span>
      </button>
      <div className="relative w-[7.25rem] shrink-0 self-stretch overflow-hidden sm:w-32">
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 bg-paper-2" aria-hidden />
        )}
        <button
          type="button"
          onClick={onAdd}
          aria-label={qty > 0 ? `Adicionar ${item.name}, ${qty} na cesta` : `Adicionar ${item.name}`}
          className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-chili text-lg font-medium leading-none text-white shadow-md shadow-chili/40"
        >
          {qty > 0 ? <span className="text-sm tabular-nums">{qty}</span> : "+"}
        </button>
      </div>
    </article>
  );
}

function DeliveryCartPanel({
  cart,
  feeCents,
  cartCents,
  count,
  onQty,
  onContinue,
}: {
  cart: CartLine[];
  feeCents: number;
  cartCents: number;
  count: number;
  onQty: (key: string, qty: number) => void;
  onContinue: () => void;
}) {
  return (
    <div className="surface flex min-h-[22rem] flex-col p-5">
      <h2 className="font-serif text-2xl">Seu pedido</h2>
      {count === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-chili/10 text-chili">
            <BagIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 font-medium">Sua cesta está vazia</p>
          <p className="mt-1 text-sm text-ink-soft">Adicione itens para começar o pedido.</p>
        </div>
      ) : (
        <>
          <ul className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
            {cart.map((line) => (
              <li key={line.key}>
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 font-medium leading-snug">
                    {line.name}
                    <OrderItemExtras modifiers={line.modifiers} />
                  </span>
                  <span className="shrink-0 tabular-nums text-sm">
                    {formatBrlFromCents(line.priceCents * line.qty)}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-1 py-0.5">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center text-lg leading-none text-ink-soft"
                    onClick={() => onQty(line.key, line.qty - 1)}
                    aria-label={`Diminuir ${line.name}`}
                  >
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm tabular-nums">{line.qty}</span>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center text-lg leading-none text-chili"
                    onClick={() => onQty(line.key, Math.min(99, line.qty + 1))}
                    aria-label={`Aumentar ${line.name}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <p className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatBrlFromCents(cartCents)}</span>
            </p>
            <p className="flex justify-between text-ink-soft">
              <span>Entrega</span>
              <span className="tabular-nums">{feeCents > 0 ? formatBrlFromCents(feeCents) : "Grátis"}</span>
            </p>
            <p className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBrlFromCents(cartCents + feeCents)}</span>
            </p>
          </div>
          <button type="button" className="btn-primary mt-4 w-full" onClick={onContinue}>
            Continuar pedido
          </button>
        </>
      )}
    </div>
  );
}

function BagIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 8h12l-.8 11.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}
