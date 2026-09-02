export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultFinanceRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

export function parseRange(from: string | null, to: string | null): { from: string; to: string } {
  const fallback = defaultFinanceRange();
  return { from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : fallback.from, to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : fallback.to };
}

export function presetRange(kind: "today" | "yesterday" | "7" | "30"): { from: string; to: string } {
  const today = new Date();
  if (kind === "today") return { from: isoDate(today), to: isoDate(today) };
  if (kind === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: isoDate(y), to: isoDate(y) };
  }
  const from = new Date(today);
  from.setDate(from.getDate() - (kind === "7" ? 6 : 29));
  return { from: isoDate(from), to: isoDate(today) };
}
