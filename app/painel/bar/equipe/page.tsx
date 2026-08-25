"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BarEquipeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/equipe");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
