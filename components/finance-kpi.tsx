export function FinanceKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function FinanceBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
      <div className="h-full rounded-full bg-chili" style={{ width: `${pct}%` }} />
    </div>
  );
}
