"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MesasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/painel/bar/mesas");
  }, [router]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}
