import { Suspense } from "react";
import { TRIAL_ENDING_SOON_DAYS } from "@eaimesa/shared";
import Link from "next/link";
import { BillingPanel } from "../../../components/billing-panel";
import { ConfiguracoesNav } from "../../../components/configuracoes-nav";

export const metadata = { title: "Pagamento" };

export default function PagamentoPage() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="eyebrow">Painel</p>
        <h1 className="mt-2 font-serif text-3xl">Configurações</h1>
        <div className="mt-6 rounded-2xl bg-paper-2/80 p-1">
          <ConfiguracoesNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-2xl">Pagamento</h2>
        <p className="mt-2 mb-8 text-ink-soft">
          Escolha o plano e o meio (cartão ou PIX). No trial o aviso aparece nos últimos{" "}
          {TRIAL_ENDING_SOON_DAYS} dias. Cadastre o{" "}
          <Link
            href="/painel/configuracoes/responsavel"
            className="font-medium text-chili underline"
          >
            responsável
          </Link>{" "}
          antes do checkout Asaas.
        </p>
        <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
          <BillingPanel />
        </Suspense>
      </div>
    </div>
  );
}
