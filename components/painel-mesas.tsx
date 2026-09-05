"use client";

import { planAllowsService, venueHasModule } from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { StaffBoard } from "./staff-board";

/**
 * Mesas do dono: view operacional (mesas + comandas + fechamento), reusa o StaffBoard.
 * Plano sem pedido no celular (Cardápio) não tem comandas → vai para as configurações de mesas.
 */
export function PainelMesas() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "board">("loading");

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => {
        const service = venueHasModule(
          s.venue,
          "guest_ordering",
          planAllowsService(s.venue.planKind ?? s.venue.plan),
        );
        if (service) {
          setMode("board");
        } else {
          router.replace("/painel/configuracoes/mesas");
        }
      })
      .catch(() => router.replace("/painel/configuracoes/mesas"));
  }, [router]);

  if (mode !== "board") {
    return <p className="text-ink-soft">Carregando…</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="eyebrow">Salão</p>
        <h1 className="mt-2 font-serif text-3xl">Mesas e comandas</h1>
      </div>
      <StaffBoard />
    </div>
  );
}
