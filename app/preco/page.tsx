import { LivePlanMarketingCards } from "../../components/home-plan-ctas";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Preço" };

export default function PrecoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-5xl flex-1 px-5 py-16">
        <p className="eyebrow">Preço</p>
        <h1 className="mt-3 font-serif text-4xl">Planos com valor na hora de adquirir.</h1>
        <p className="mt-3 text-ink-soft">
          Mensalidade fixa, sem comissão. Trial de 7 dias; depois cobra o valor do plano ou a
          promoção, se estiver preenchida. No painel você escolhe cartão ou PIX.
        </p>
        <div className="mt-10">
          <LivePlanMarketingCards />
        </div>
        <p className="mt-8 text-sm text-ink-soft">
          Subir de Cardápio para Auto atendimento pode a qualquer momento. Trocar SKUs do mesmo tipo
          também. Descer de tipo só depois do fim da vigência paga.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
