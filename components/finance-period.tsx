"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { defaultFinanceRange, parseRange, presetRange } from "../lib/finance-range";

export function FinancePeriodBar() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { from, to } = parseRange(params.get("from"), params.get("to"));

  useEffect(() => {
    if (params.get("from") && params.get("to")) return;
    const next = defaultFinanceRange();
    const sp = new URLSearchParams(params.toString());
    sp.set("from", next.from);
    sp.set("to", next.to);
    router.replace(`${path}?${sp.toString()}`);
  }, [params, path, router]);

  function apply(next: { from: string; to: string }) {
    const sp = new URLSearchParams(params.toString());
    sp.set("from", next.from);
    sp.set("to", next.to);
    router.replace(`${path}?${sp.toString()}`);
  }

  return (
    <div className="surface flex flex-wrap items-end gap-3 p-4">
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">De</span>
        <input
          type="datetime-local"
          className="field min-w-[13.5rem]"
          value={from}
          max={to}
          onChange={(e) => apply({ from: e.target.value, to })}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-soft">Até</span>
        <input
          type="datetime-local"
          className="field min-w-[13.5rem]"
          value={to}
          min={from}
          onChange={(e) => apply({ from, to: e.target.value })}
        />
      </label>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["today", "Hoje"],
            ["yesterday", "Ontem"],
            ["7", "7 dias"],
            ["30", "30 dias"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            className="btn-ghost !py-1.5 text-sm"
            onClick={() => apply(presetRange(kind))}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="basis-full text-xs text-ink-soft">
        Horário de Brasília. Expediente noturno: ex. dia 2 às 18:00 até dia 3 às 03:00.
      </p>
    </div>
  );
}

export function useFinanceQuery(): { from: string; to: string; qs: string } {
  const params = useSearchParams();
  const { from, to } = parseRange(params.get("from"), params.get("to"));
  return {
    from,
    to,
    qs: `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  };
}
