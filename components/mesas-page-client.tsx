"use client";

import { planAllowsService } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { TablesEditor } from "./tables-editor";

export function MesasPageClient() {
  const [service, setService] = useState<boolean | null>(null);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => setService(planAllowsService(s.venue.planKind ?? s.venue.plan)))
      .catch(() => setService(false));
  }, []);

  return (
    <div>
      <p className="eyebrow">{service ? "Operação" : "Salão"}</p>
      <h1 className="mt-2 font-serif text-3xl">Mesas</h1>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        {service
          ? "Cadastre o salão e exporte o QR do cardápio (geral ou por mesa). O QR do garçom — que abre a comanda — é gerado em /garcom."
          : "Cadastre as mesas e exporte o QR de cada uma para o adesivo. O cliente abre o cardápio no celular — sem pedido neste plano."}
      </p>
      {service === null ? <p className="text-ink-soft">Carregando…</p> : <TablesEditor showVenueQr />}
    </div>
  );
}
