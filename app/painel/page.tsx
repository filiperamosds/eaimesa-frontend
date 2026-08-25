"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeForSession } from "../../lib/auth-redirect";
import { api } from "../../lib/api";
import type { Session } from "../../lib/types";

export default function PainelIndex() {
  const router = useRouter();
  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((session) => {
        router.replace(homeForSession(session));
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return <p className="text-ink-soft">Abrindo painel…</p>;
}
