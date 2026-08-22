import { TRIAL_ENDING_SOON_DAYS } from "@eaimesa/shared";
import { BillingPanel } from "../../../components/billing-panel";

export const metadata = { title: "Pagamento" };

export default function PagamentoPage() {
  return (
    <div>
      <p className="eyebrow">Assinatura</p>
      <h1 className="mt-2 font-serif text-3xl">Pagamento</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Escolha o plano e o meio (cartão ou PIX). No trial o aviso aparece nos últimos{" "}
        {TRIAL_ENDING_SOON_DAYS} dias; você pode pagar antes em Meu bar. Número de cartão, validade
        e CVV nunca passam pelo EaiMesa.
      </p>
      <BillingPanel />
    </div>
  );
}

export const metadata = { title: "Pagamento" };

export default function PagamentoPage() {
  return (
    <div>
      <p className="eyebrow">Assinatura</p>
      <h1 className="mt-2 font-serif text-3xl">Pagamento</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Escolha o plano e o meio (cartão ou PIX). No trial o aviso aparece nos últimos 3 dias; você
        pode pagar antes em Meu bar. Número de cartão, validade e CVV nunca passam pelo EaiMesa.
      </p>
      <BillingPanel />
    </div>
  );
}
