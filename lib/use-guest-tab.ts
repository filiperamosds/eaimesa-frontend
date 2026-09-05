"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { clearStoredMesa } from "./mesa-session-storage";
import type { GuestTab } from "./types";
import { readWelcomePin } from "./welcome-storage";

export function useGuestTab(slug: string, enabled = true) {
  const [tab, setTab] = useState<GuestTab | null | undefined>(enabled ? undefined : null);

  useEffect(() => {
    if (!enabled || !slug) {
      setTab(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await api<GuestTab>("/v1/guest/tab");
        if (cancelled) return;
        if (data.slug === slug) {
          clearStoredMesa(slug);
          setTab({ ...data, pinDisplay: data.pinDisplay ?? readWelcomePin(slug) });
        } else {
          setTab(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 409)) {
          setTab(null);
          return;
        }
        setTab(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  return tab;
}
