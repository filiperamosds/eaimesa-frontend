"use client";

import { isReservedSlug } from "@eaimesa/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { loadPublicMenu, venueAllowsGuestOrdering } from "../lib/load-public-menu";
import type { PublicMenu } from "../lib/types";
import { useVenueSlug } from "../lib/venue-path";

export function GuestOrderingGate({ children }: { children: ReactNode }) {
  const slug = useVenueSlug();
  const router = useRouter();
  const [menu, setMenu] = useState<PublicMenu | null | undefined>(undefined);

  useEffect(() => {
    if (!slug || isReservedSlug(slug)) {
      setMenu(null);
      return;
    }
    let cancelled = false;
    loadPublicMenu(slug)
      .then((m) => {
        if (!cancelled) setMenu(m);
      })
      .catch(() => {
        if (!cancelled) setMenu(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || !menu) return;
    if (!venueAllowsGuestOrdering(menu)) router.replace(`/${slug}`);
  }, [slug, menu, router]);

  if (!slug) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-ink-soft">Cardápio não encontrado.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Início
        </Link>
      </div>
    );
  }

  if (menu === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-ink-soft">Carregando…</div>
    );
  }

  if (!menu || !venueAllowsGuestOrdering(menu)) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-ink-soft">Carregando…</div>
    );
  }

  return <>{children}</>;
}
