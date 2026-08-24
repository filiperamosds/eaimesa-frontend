"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ConfiguracoesIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/cardapio");
  }, [router]);
  return <p className="text-ink-soft">Abrindo configurações…</p>;
}
