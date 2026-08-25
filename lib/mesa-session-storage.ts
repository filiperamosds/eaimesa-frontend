/** sessionStorage por venue — evita ?mesa= permanecer na barra de endereço (compartilhamento). */
const KEY_PREFIX = "eaimesa_mesa:";

function storageKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

export function readStoredMesa(slug: string): string | null {
  if (typeof window === "undefined" || !slug) return null;
  try {
    const code = sessionStorage.getItem(storageKey(slug))?.trim();
    return code || null;
  } catch {
    return null;
  }
}

export function storeMesa(slug: string, code: string): void {
  if (typeof window === "undefined" || !slug) return;
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(storageKey(slug), trimmed);
  } catch {
    /* quota / modo privado */
  }
}

export function clearStoredMesa(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    sessionStorage.removeItem(storageKey(slug));
  } catch {
    /* ignore */
  }
}

/** Remove `?mesa=` da URL sem recarregar a página. */
export function stripMesaFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("mesa")) return;
  url.searchParams.delete("mesa");
  const search = url.searchParams.toString();
  const next = url.pathname + (search ? `?${search}` : "") + url.hash;
  window.history.replaceState(null, "", next);
}

/**
 * QR ainda traz `?mesa=` — na 1ª abertura grava no sessionStorage e limpa a URL.
 * Depois só lê do storage (mesma aba / sessão do navegador).
 */
export function resolveMesaCode(slug: string): string | null {
  if (typeof window === "undefined" || !slug) return null;
  const fromUrl = new URLSearchParams(window.location.search).get("mesa")?.trim();
  if (fromUrl) {
    storeMesa(slug, fromUrl);
    stripMesaFromUrl();
    return fromUrl;
  }
  return readStoredMesa(slug);
}
