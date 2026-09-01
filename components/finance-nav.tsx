"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function norm(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

export function FinanceNav() {
  const path = norm(usePathname() ?? "");
  const params = useSearchParams();
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";
  const reports = path.includes("/relatorios");

  const links = [
    { href: `/painel/financeiro${suffix}`, label: "Faturamento", active: !reports },
    { href: `/painel/financeiro/relatorios${suffix}`, label: "Relatórios", active: reports },
  ];

  return (
    <nav aria-label="Financeiro" className="flex gap-1 overflow-x-auto rounded-2xl bg-paper-2/80 p-1">
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className={
            l.active
              ? "shrink-0 rounded-xl bg-card px-4 py-2 text-sm font-medium text-chili shadow-sm"
              : "shrink-0 rounded-xl px-4 py-2 text-sm text-ink-soft hover:text-ink"
          }
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
