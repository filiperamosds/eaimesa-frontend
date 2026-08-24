"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BarMesasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/mesas");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
