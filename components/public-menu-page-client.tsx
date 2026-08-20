"use client";

import { isReservedSlug } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPublicMenu } from "../lib/load-public-menu";
import type { PublicMenu } from "../lib/types";
import { useVenueSlug } from "../lib/venue-path";
import { PublicMenuView } from "./public-menu";

export function PublicMenuPageClient() {
  const slug = useVenueSlug();
  const [menu, setMenu] = useState<PublicMenu | null | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!slug || isReservedSlug(slug)) {
      setMenu(null);
      return;
    }
    let cancelled = false;
    loadPublicMenu(slug)
      .then((m) => {
        if (cancelled) return;
        setMenu(m);
        if (m) document.title = `${m.venue.name} · EaiMesa`;
      })
      .catch(() => {
        if (!cancelled) {
          setUnavailable(true);
          setMenu(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (unavailable) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-ink-soft">Cardápio temporariamente indisponível. Tente de novo em instantes.</p>
      </div>
    );
  }

  if (menu === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-ink-soft">Carregando cardápio…</div>
    );
  }

  if (!menu) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-serif text-3xl">Cardápio não encontrado</h1>
        <Link href="/" className="btn-primary mt-6">
          Ir para o início
        </Link>
      </div>
    );
  }

  return <PublicMenuView menu={menu} />;
}
