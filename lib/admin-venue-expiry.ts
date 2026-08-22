/** Datas de trial/vigência na lista e no modal de `/admin/bares`. */

export function formatPtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

export function formatPtDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** `datetime-local` espera `YYYY-MM-DDTHH:mm` no fuso do browser. */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Interpreta o valor local e devolve ISO8601 UTC. */
export function datetimeLocalToIsoUtc(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type VenueExpiryCopy = {
  text: string;
  title: string;
  expired: boolean;
};

/**
 * Coluna Expiração: trial usa `trialEndsAt`; active/past_due/suspended usam
 * `currentPeriodEndsAt` (fallback `trialEndsAt`).
 */
export function venueExpiryCopy(
  venue: {
    subscriptionStatus: string;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
  },
  now: Date = new Date(),
): VenueExpiryCopy {
  if (venue.subscriptionStatus === "trial") {
    const label = formatPtDate(venue.trialEndsAt);
    const title = formatPtDateTime(venue.trialEndsAt) ?? "";
    if (!venue.trialEndsAt || !label) {
      return { text: "Sem data de trial", title: "", expired: false };
    }
    if (new Date(venue.trialEndsAt).getTime() < now.getTime()) {
      return { text: "Trial expirado", title, expired: true };
    }
    return { text: `Expira em ${label}`, title, expired: false };
  }

  const iso = venue.currentPeriodEndsAt ?? venue.trialEndsAt;
  const label = formatPtDate(iso);
  const title = formatPtDateTime(iso) ?? "";
  if (!iso || !label) {
    return { text: "Sem vigência", title: "", expired: false };
  }
  return {
    text: `Vigência até ${label}`,
    title,
    expired: new Date(iso).getTime() < now.getTime(),
  };
}
