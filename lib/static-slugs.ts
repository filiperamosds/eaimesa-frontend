export const FALLBACK_STATIC_SLUG = "__venue";

/** Slugs pré-gerados no `pnpm build`. Novos estabelecimentos caem no HTML de `__venue` via `.htaccess`. */
export function venueStaticParams(): { slug: string }[] {
  const fromEnv = (process.env.STATIC_SLUGS ?? "bar-do-tiao,cafe-da-lina")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([FALLBACK_STATIC_SLUG, ...fromEnv])].map((slug) => ({ slug }));
}
