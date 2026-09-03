import { BrandFoodPattern, BrandPhoneMock } from "../components/brand-phone-mock";
import { HomePlanCtas, LivePlanMarketingCards } from "../components/home-plan-ctas";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div>
              <p className="eyebrow">SaaS para estabelecimentos</p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-ink sm:text-6xl">
                O cardápio no celular.
                <span className="block text-chili">A fila, na tela do estabelecimento.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                Uma URL sua — tipo <span className="font-medium text-ink">/seu-estabelecimento</span>. Sem app
                para instalar, sem tablet sujo na mesa. Pedido pelo QR do garçom entra depois; o link
                público nunca abre comanda sozinho.
              </p>
              <HomePlanCtas />
            </div>

            <BrandPhoneMock />
          </div>
        </section>

        <section className="relative overflow-hidden bg-chili text-white">
          <BrandFoodPattern className="pointer-events-none absolute -right-8 top-0 h-full w-[min(100%,42rem)] text-white" />
          <div className="relative mx-auto max-w-6xl px-5 py-10 sm:py-12">
            <p className="font-serif text-2xl leading-snug sm:text-3xl">
              O cardápio no celular. A fila, na tela do estabelecimento.
            </p>
            <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
              Auto atendimento com a cara da casa — o cliente lê no próprio aparelho.
            </p>
          </div>
        </section>

        <section className="border-y border-line bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Cadastre o estabelecimento",
                d: "E-mail, senha e a URL do cardápio. Em minutos você está no ar.",
              },
              {
                n: "02",
                t: "Publique o cardápio",
                d: "Categorias, foto e preço no servidor. No Auto atendimento, mesas e equipe entram depois.",
              },
              {
                n: "03",
                t: "Opere a fila",
                d: "No Auto atendimento o cliente pede no celular. Kanban no painel e na tela do garçom.",
              },
            ].map((s) => (
              <div key={s.n} className="surface p-6">
                <p className="font-serif text-3xl text-chili/80">{s.n}</p>
                <h3 className="mt-3 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow">Planos</p>
          <h2 className="mt-3 font-serif text-4xl">Escolha o que o estabelecimento precisa</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Dois tipos de produto — Cardápio ou Auto atendimento — e os SKUs que o operador listar
            no console. Trial de 7 dias. A cobrança (cartão ou PIX) aparece no painel quando o trial
            estiver acabando.
          </p>
          <div className="mt-10">
            <LivePlanMarketingCards />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
