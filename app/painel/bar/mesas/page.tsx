"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Bookmark antigo: Mesas ficam em Configurações. */
export default function BarMesasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/mesas");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
