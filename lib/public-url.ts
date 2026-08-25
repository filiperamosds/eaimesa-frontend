const DEFAULT_PUBLIC_ORIGIN = "http://mac-filipe.local:3000";

/** Base pública do front (QR do cardápio e comanda no SSR). */
export function appPublicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

/** URL do cardápio público — QR fixo. Com `mesa` (menuCode) → `/{slug}?mesa=…` (ADR-026). */
export function publicMenuUrl(slug: string, opts?: { mesa?: string | null }): string {
  const base = appPublicOrigin().replace(/\/$/, "");
  const path = `${base}/${slug}`;
  const code = opts?.mesa?.trim();
  if (!code) return path;
  return `${path}?mesa=${encodeURIComponent(code)}`;
}

/** URL de redeem do claim — QR do garçom. Abre comanda. */
export function claimRedeemUrl(slug: string, token: string): string {
  const base = appPublicOrigin().replace(/\/$/, "");
  return `${base}/${slug}/c/${token}`;
}
