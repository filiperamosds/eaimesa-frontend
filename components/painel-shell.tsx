"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isPanelMember, planAllowsService, shouldPromptSubscriptionPayment } from "@eaimesa/shared";
import { api } from "../lib/api";
import { paymentPromptForVenue } from "../lib/billing-prompt";
import type { Session } from "../lib/types";
import { AccountMenu, initialsFrom } from "./account-menu";
import { Logo } from "./site-chrome";

// Nav do painel = módulos do plano. Configurações fica só no avatar.
// `module` é a chave do módulo (ADR-029); `always` mostra o link mesmo quando
// `venue.modules` não veio (compat) para módulos que existem em qualquer plano.
const ALL_LINKS = [
  { href: "/painel/pedidos", label: "Pedidos", icon: "▣", module: "orders_kanban", always: false },
  { href: "/painel/financeiro", label: "Financeiro", icon: "$", module: "finance", always: false },
  { href: "/painel/mesas", label: "Mesas", icon: "▦", module: "tables", always: true },
  { href: "/painel/chamados", label: "Chamados", icon: "◎", module: "waiter_call", always: true },
  { href: "/painel/caixa", label: "Caixa", icon: "▤", module: "finance", always: false },
] as const;

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

/** Rotas só do Auto atendimento — Cardápio é redirecionado. */
const SERVICE_ONLY_PREFIXES = [
  "/painel/pedidos",
  "/painel/financeiro",
  "/painel/caixa",
  "/painel/equipe",
  "/painel/configuracoes/equipe",
  "/painel/bar/equipe",
  "/painel/bar/configuracoes",
];

export function PainelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((session) => {
        if (session.role === "staff") {
          if (!isPanelMember(session)) {
            router.replace("/garcom");
            return;
          }
          if (!path.startsWith("/painel/pedidos")) {
            router.replace("/painel/pedidos");
            return;
          }
          setMe(session);
          return;
        }
        setMe(session);
        const service = planAllowsService(session.venue.planKind ?? session.venue.plan);
        if (!service && SERVICE_ONLY_PREFIXES.some((p) => path.startsWith(p))) {
          router.replace("/painel/configuracoes/cardapio");
        }
      })
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/login");
      });
  }, [router, path]);

  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        {err ?? "Carregando painel…"}
      </div>
    );
  }

  const panel = isPanelMember(me);
  const promptPayment = !panel && shouldPromptSubscriptionPayment(me.venue);
  const onPagamento =
    path.startsWith("/painel/pagamento") ||
    path.startsWith("/painel/bar/plano") ||
    path.startsWith("/painel/configuracoes/responsavel");
  const prompt = promptPayment ? paymentPromptForVenue(me.venue) : null;
  const service = planAllowsService(me.venue.planKind ?? me.venue.plan);
  const links = panel
    ? []
    : ALL_LINKS.filter((l) => {
        const mods = me.venue.modules;
        // Módulos no plano vêm serializados em venue.modules; sem eles, usa fallback.
        if (mods) return mods[l.module] !== undefined;
        return l.always || service;
      });

  return (
    <div className={`min-h-screen ${panel || links.length === 0 ? "pb-0" : "pb-24 sm:pb-0"}`}>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2 text-sm">
            {panel ? (
              <span className="hidden text-ink-soft sm:inline">
                {me.member?.name ?? me.account.email} · Painel
              </span>
            ) : (
              <Link href={`/${me.venue.slug}`} className="btn-ghost hidden sm:inline-flex">
                Ver cardápio
              </Link>
            )}
            <AccountMenu
              initials={initialsFrom(
                panel
                  ? me.member?.name || me.account.email
                  : me.venue.name || me.account.email,
              )}
              label={panel ? (me.member?.name ?? me.account.email) : me.account.email}
              items={
                panel
                  ? [{ type: "button", label: "Sair", onClick: () => void logout(), danger: true }]
                  : [
                      { type: "link", href: "/painel/configuracoes", label: "Configurações" },
                      { type: "button", label: "Sair", onClick: () => void logout(), danger: true },
                    ]
              }
            />
          </div>
        </div>
        {links.length > 0 ? (
          <div className="mx-auto hidden max-w-[88rem] px-5 pb-3 sm:block">
            <PainelNav path={path} links={links} />
          </div>
        ) : null}
      </header>
      {prompt && !onPagamento ? (
        <div className="border-b border-chili/25 bg-chili/5">
          <div className="mx-auto flex max-w-[88rem] flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-chili">{prompt.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{prompt.body}</p>
            </div>
            <Link href="/painel/pagamento" className="btn-primary !py-2 text-sm">
              {prompt.cta}
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-[88rem] px-5 py-6">{children}</div>
      {links.length === 0 ? null : (
        <nav
          aria-label="Painel"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-xl sm:hidden"
        >
          <ul className={`grid px-2 py-2 ${COLS[links.length] ?? "grid-cols-3"}`}>
            {links.map((l) => {
              const active = path.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] ${
                      active ? "text-chili" : "text-ink-soft"
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {l.icon}
                    </span>
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function PainelNav({
  path,
  links,
}: {
  path: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Painel" className="flex rounded-2xl bg-paper-2/80 p-1">
      {links.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "flex-1 rounded-xl bg-card px-3 py-2.5 text-center text-sm font-medium text-chili shadow-sm"
                : "flex-1 rounded-xl px-3 py-2.5 text-center text-sm text-ink-soft hover:text-ink"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
