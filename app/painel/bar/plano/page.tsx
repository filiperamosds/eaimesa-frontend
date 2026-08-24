"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function RedirectInner() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const qs = sp.toString();
    router.replace(`/painel/pagamento${qs ? `?${qs}` : ""}`);
  }, [router, sp]);
  return <p className="text-ink-soft">Redirecionando…</p>;
}

export default function BarPlanoRedirect() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Redirecionando…</p>}>
      <RedirectInner />
    </Suspense>
  );
}
