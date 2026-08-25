"use client";

import { planAllowsService } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { VenueCloseSettings } from "./venue-close-settings";
import { VenueSettings } from "./venue-settings";

export function ConfigBarPanels() {
  const [service, setService] = useState(false);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => setService(planAllowsService(s.venue.planKind ?? s.venue.plan)))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="font-serif text-2xl">Meu estabelecimento</h2>
        <p className="mt-2 mb-8 text-ink-soft">
          Este nome curto entra na URL do cardápio. Exemplo: /bar-do-tiao. Palavras como login e
          painel não podem ser usadas.
        </p>
        <VenueSettings />
      </div>
      {service ? (
        <div>
          <h2 className="font-serif text-2xl">Encerramento no salão</h2>
          <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
            Regras do salão. O caixa não é afetado — ele sempre pode fechar comanda e mesa.
          </p>
          <VenueCloseSettings />
        </div>
      ) : null}
    </div>
  );
}
