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
        {TRIAL_ENDING_SOON_DAYS} dias; você pode pagar antes em Meu bar. Os 30 dias do plano somam no
        fim do trial ou da vigência atual — pagar cedo não queima o que ainda resta. Número de
        cartão, validade e CVV nunca passam pelo EaiMesa.
      </p>
      <BillingPanel />
    </div>
  );
}
