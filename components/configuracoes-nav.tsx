"use client";

import { planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";

const LINKS = [
  { href: "/painel/configuracoes/cardapio", label: "Cardápio", service: false, module: null },
  { href: "/painel/configuracoes/bar", label: "Estabelecimento", service: false, module: null },
  { href: "/painel/configuracoes/mesas", label: "Mesas", service: false, module: null },
  { href: "/painel/configuracoes/chamada", label: "Chamada", service: false, module: null },
  { href: "/painel/configuracoes/equipe", label: "Equipe", service: true, module: null },
  { href: "/painel/configuracoes/financeiro", label: "Financeiro", service: true, module: "service_fee" },
  { href: "/painel/configuracoes/responsavel", label: "Responsável", service: false, module: null },
  { href: "/painel/pagamento", label: "Pagamento", service: false, module: null },
] as const;

export function ConfiguracoesNav() {
  const path = usePathname();
  const [service, setService] = useState(true);
  const [feeOn, setFeeOn] = useState(true);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => {
        const svc = planAllowsService(s.venue.planKind ?? s.venue.plan);
        setService(svc);
        // Mostra a config se o módulo está no plano (mesmo desligado, para poder ligar).
        setFeeOn(s.venue.modules ? Boolean(s.venue.modules.service_fee) : svc);
      })
      .catch(() => undefined);
  }, []);

  const links = LINKS.filter((l) => {
    if (l.service && !service) return false;
    if (l.module === "service_fee" && !feeOn) return false;
    return true;
  });

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
