"use client";

import { planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";

const LINKS = [
  { href: "/painel/bar", label: "Dados do bar", exact: true, service: false },
  { href: "/painel/bar/plano", label: "Plano e pagamentos", exact: false, service: false },
  { href: "/painel/bar/mesas", label: "Configuração de mesas", exact: false, service: true },
  { href: "/painel/bar/equipe", label: "Equipe", exact: false, service: true },
  { href: "/painel/bar/configuracoes", label: "Configurações", exact: false, service: true },
] as const;

export function BarHubNav() {
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
      aria-label="Meu bar"
      className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {links.map((l) => {
        const active = l.exact
          ? path === l.href || path === `${l.href}/`
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
