"use client";

import { isReservedSlug } from "@eaimesa/shared";
import { useSyncExternalStore } from "react";
import { FALLBACK_STATIC_SLUG } from "./static-slugs";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function pathSegments(): string[] {
  if (typeof window === "undefined") return [];
  return window.location.pathname.split("/").filter(Boolean);
}

export function useVenueSlug(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const slug = pathSegments()[0] ?? null;
      if (!slug || slug === FALLBACK_STATIC_SLUG || isReservedSlug(slug)) return null;
      return slug;
    },
    () => null,
  );
}

export function useClaimToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const parts = pathSegments();
      if (parts.length >= 3 && parts[1] === "c" && parts[2]) return decodeURIComponent(parts[2]);
      return null;
    },
    () => null,
  );
}
