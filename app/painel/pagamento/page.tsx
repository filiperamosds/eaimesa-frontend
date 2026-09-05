import { Suspense } from "react";
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
        <h2 className="mb-8 font-serif text-2xl">Pagamento</h2>
        <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
          <BillingPanel />
        </Suspense>
      </div>
    </div>
  );
}
