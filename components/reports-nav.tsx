"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function norm(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

const LINKS = [
  { href: "/painel/financeiro/relatorios", label: "Dashboard" },
  { href: "/painel/financeiro/relatorios/pedidos", label: "Pedidos" },
  { href: "/painel/financeiro/relatorios/comandas", label: "Comandas" },
  { href: "/painel/financeiro/relatorios/itens", label: "Itens" },
  { href: "/painel/financeiro/relatorios/caixa", label: "Turnos" },
  { href: "/painel/financeiro/relatorios/equipe", label: "Equipe" },
] as const;

export function ReportsNav() {
  const path = norm(usePathname() ?? "");
  const params = useSearchParams();
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <nav aria-label="Relatórios" className="flex gap-1 overflow-x-auto pb-1">
      {LINKS.map((l) => {
        const base = norm(l.href);
        const active = path === base;
        return (
          <Link
            key={l.href}
            href={`${l.href}${suffix}`}
            className={
              active
                ? "shrink-0 rounded-xl bg-card px-3 py-1.5 text-sm font-medium text-chili shadow-sm"
                : "shrink-0 rounded-xl px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
