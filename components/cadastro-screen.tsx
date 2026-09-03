"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RegisterForm } from "./auth-forms";
import { CadastroPlanPicker } from "./cadastro-plan-picker";
import { Logo } from "./site-chrome";
import { useBillingPlans } from "../lib/use-billing-plans";

export function CadastroScreen() {
  const requested = useSearchParams().get("plano");
  const { plans, trialDays } = useBillingPlans();
  const [plan, setPlan] = useState(() =>
    requested && requested.length >= 3 ? requested : "cardapio",
  );

  useEffect(() => {
    setPlan((cur) => {
      if (plans.some((p) => p.id === cur)) return cur;
      if (requested && plans.some((p) => p.id === requested)) return requested;
      return plans[0]?.id ?? cur;
    });
  }, [plans, requested]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-y-auto bg-night p-10 text-white lg:flex lg:flex-col">
        <Logo invert withTagline />
        <div className="mt-12 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Começar</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">Sua URL, no ar em minutos.</h1>
          <p className="mt-4 max-w-sm text-white/65">
            Escolha o plano aqui — o selecionado fica marcado. Trial depois de confirmar o e-mail; a
            cobrança entra depois.
          </p>
          <div className="mt-8">
            <CadastroPlanPicker
              plans={plans}
              plan={plan}
              onChange={setPlan}
              trialDays={trialDays}
              tone="night"
            />
          </div>
        </div>
        <p className="mt-10 text-sm text-white/40">eaimesa.com.br/sua-casa</p>
      </aside>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-5 py-12">
        <Logo className="mb-8 lg:hidden" />
        <h1 className="font-serif text-3xl">Cadastrar o estabelecimento</h1>
        <p className="mt-2 mb-8 text-ink-soft">
          Nome do estabelecimento e responsável. O plano fica na faixa à esquerda; no celular,
          aparece abaixo. O trial começa depois de confirmar o e-mail.
        </p>
        <RegisterForm
          plans={plans}
          plan={plan}
          onPlanChange={setPlan}
          trialDays={trialDays}
          planPicker="mobile"
        />
      </div>
    </div>
  );
}
