"use client";

import { planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";

const LINKS = [
  { href: "/painel/configuracoes/cardapio", label: "Cardápio", service: false },
  { href: "/painel/configuracoes/bar", label: "Meu bar", service: false },
  { href: "/painel/configuracoes/mesas", label: "Mesas", service: false },
  { href: "/painel/configuracoes/chamada", label: "Chamada", service: false },
  { href: "/painel/configuracoes/equipe", label: "Equipe", service: true },
  { href: "/painel/configuracoes/responsavel", label: "Responsável", service: false },
  { href: "/painel/pagamento", label: "Pagamento", service: false },
] as const;

export function ConfiguracoesNav() {
  const path = usePathname();
  const [service, setService] = useState(true);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => setService(planAllowsService(s.venue.planKind ?? s.venue.plan)))
      .catch(() => undefined);
  }, []);

  const links = LINKS.filter((l) => !l.service || service);

  return (
    <nav
      aria-label="Configurações"
      className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {links.map((l) => {
        const active =
          l.href === "/painel/pagamento"
            ? path.startsWith("/painel/pagamento") || path.startsWith("/painel/bar/plano")
            : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "shrink-0 rounded-xl bg-card px-3 py-2 text-sm font-medium text-chili shadow-sm lg:w-full"
                : "shrink-0 rounded-xl px-3 py-2 text-sm text-ink-soft hover:text-ink lg:w-full"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
