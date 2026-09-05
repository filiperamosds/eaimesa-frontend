const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Valor de `datetime-local` no fuso do browser (painel = Brasília). */
export function isoDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isoDate(d: Date): string {
  return isoDateTime(d).slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 0, 0);
  return x;
}

/** Query antiga só com dia vira 00:00 / 23:59 para o input datetime-local. */
export function toDateTimeLocal(value: string, end: boolean): string {
  if (DATE_ONLY.test(value)) return `${value}T${end ? "23:59" : "00:00"}`;
  if (DATE_TIME.test(value)) return value.slice(0, 16);
  return value;
}

export function isRangeValue(value: string | null): value is string {
  return Boolean(value && (DATE_ONLY.test(value) || DATE_TIME.test(value)));
}

export function defaultFinanceRange(): { from: string; to: string } {
  const to = endOfDay(new Date());
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - 30);
  return { from: isoDateTime(from), to: isoDateTime(to) };
}

export function parseRange(from: string | null, to: string | null): { from: string; to: string } {
  const fallback = defaultFinanceRange();
  return {
    from: isRangeValue(from) ? toDateTimeLocal(from, false) : fallback.from,
    to: isRangeValue(to) ? toDateTimeLocal(to, true) : fallback.to,
  };
}

export function presetRange(kind: "today" | "yesterday" | "7" | "30"): { from: string; to: string } {
  const today = new Date();
  if (kind === "today") {
    return { from: isoDateTime(startOfDay(today)), to: isoDateTime(endOfDay(today)) };
  }
  if (kind === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: isoDateTime(startOfDay(y)), to: isoDateTime(endOfDay(y)) };
  }
  const from = startOfDay(today);
  from.setDate(from.getDate() - (kind === "7" ? 6 : 29));
  return { from: isoDateTime(from), to: isoDateTime(endOfDay(today)) };
}
