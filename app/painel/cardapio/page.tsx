"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CardapioRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/cardapio");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
