import { BillingPanel } from "../../../components/billing-panel";

export const metadata = { title: "Pagamento" };

export default function PagamentoPage() {
  return (
    <div>
      <p className="eyebrow">Assinatura</p>
      <h1 className="mt-2 font-serif text-3xl">Pagamento</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Escolha o plano e pague com cartão ou PIX. Trial de 7 dias; a cobrança vale o período da
        vigência. Número de cartão, validade e CVV nunca passam pelo EaiMesa.
      </p>
      <BillingPanel />
    </div>
  );
}
