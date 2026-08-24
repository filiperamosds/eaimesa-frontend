"use client";

import { useEffect, useState } from "react";
import { RepresentativeForm } from "../../../../components/representative-form";
import { api } from "../../../../lib/api";
import type { Session } from "../../../../lib/types";

export default function ConfigResponsavelPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((s) => setEmail(s.account.email))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl">Responsável</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Dados do responsável pelo estabelecimento. O checkout de plano usa estes campos como
        pagador (Asaas), sem digitar de novo — salvo se você alterar na tela de pagamento.
      </p>
      <RepresentativeForm defaultEmail={email} />
    </div>
  );
}
