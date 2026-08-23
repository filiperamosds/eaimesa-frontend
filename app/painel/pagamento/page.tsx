"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PagamentoRedirect() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const qs = sp.toString();
    router.replace(`/painel/bar/plano${qs ? `?${qs}` : ""}`);
  }, [router, sp]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
