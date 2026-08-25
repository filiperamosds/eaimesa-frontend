"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BarDadosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/configuracoes/bar");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
