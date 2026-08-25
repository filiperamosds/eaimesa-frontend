export const RESERVED_SLUGS = [
  "login",
  "cadastro",
  "painel",
  "app",
  "api",
  "admin",
  "termos",
  "privacidade",
  "preco",
  "pricing",
  "sobre",
  "contato",
  "health",
  "static",
  "assets",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "garcom",
  "bem-vindo",
  "__venue",
] as const;

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 48;

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

/** "Bar do Tião" → "bar-do-tiao". Pode ficar curto demais até o nome ter 3 caracteres úteis. */
export function slugifyFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

/** `bar-do-tiao` + 2 → `bar-do-tiao-2`. */
export function withSlugSuffix(base: string, n: number): string {
  if (n <= 1) return base.slice(0, SLUG_MAX);
  const suffix = `-${n}`;
  const maxHead = Math.max(1, SLUG_MAX - suffix.length);
  const head = base.slice(0, maxHead).replace(/-+$/g, "") || "casa";
  return `${head}${suffix}`.slice(0, SLUG_MAX);
}
