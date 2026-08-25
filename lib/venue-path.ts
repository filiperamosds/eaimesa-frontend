"use client";

import { isReservedSlug } from "@eaimesa/shared";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FALLBACK_STATIC_SLUG } from "./static-slugs";

function segmentsOf(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function slugFromPathname(pathname: string): string | null {
  const slug = segmentsOf(pathname)[0] ?? null;
  if (!slug || slug === FALLBACK_STATIC_SLUG || isReservedSlug(slug)) return null;
  return slug;
}

function claimTokenFromPathname(pathname: string): string | null {
  const parts = segmentsOf(pathname);
  if (parts.length >= 3 && parts[1] === "c" && parts[2]) return decodeURIComponent(parts[2]);
  return null;
}

/**
 * Path do browser. `undefined` até hidratar — o HTML estático de `__venue`
 * não tem o slug real; isso não é 404.
 */
function useBrowserPathname(): string | undefined {
  const nextPath = usePathname();
  const [path, setPath] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPath(window.location.pathname);
  }, [nextPath]);

  return path;
}

/** `undefined` = ainda lendo a URL. `null` = slug inválido. */
export function useVenueSlug(): string | null | undefined {
  const path = useBrowserPathname();
  if (path === undefined) return undefined;
  return slugFromPathname(path);
}

export function useClaimToken(): string | null | undefined {
  const path = useBrowserPathname();
  if (path === undefined) return undefined;
  return claimTokenFromPathname(path);
}
