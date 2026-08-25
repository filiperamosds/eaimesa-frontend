"use client";

import {
  ERROR_CODES,
  isReservedSlug,
  SLUG_MIN,
  slugifyFromName,
  withSlugSuffix,
} from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";

export async function publicSlugTaken(slug: string): Promise<boolean> {
  try {
    await api(`/v1/public/venues/${encodeURIComponent(slug)}`);
    return true;
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.code === ERROR_CODES.VENUE_NOT_FOUND)
    ) {
      return false;
    }
    return false;
  }
}

export async function allocateMenuSlug(
  name: string,
  opts?: { exclude?: string | null },
): Promise<string> {
  const root = slugifyFromName(name);
  if (root.length < SLUG_MIN) return root;
  const exclude = opts?.exclude ?? "";
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? root : withSlugSuffix(root, n);
    if (candidate.length < SLUG_MIN || isReservedSlug(candidate)) continue;
    if (candidate === exclude || !(await publicSlugTaken(candidate))) return candidate;
  }
  return withSlugSuffix(root, 99);
}

export function useMenuSlugFromName(name: string, exclude?: string | null) {
  const [slug, setSlug] = useState(() => slugifyFromName(name));

  useEffect(() => {
    const preview = slugifyFromName(name);
    setSlug(preview);
    if (preview.length < SLUG_MIN) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void allocateMenuSlug(name, { exclude }).then((next) => {
        if (!cancelled) setSlug(next);
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, exclude]);

  return slug;
}
