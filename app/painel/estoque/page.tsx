"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EstoqueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/estoque");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
