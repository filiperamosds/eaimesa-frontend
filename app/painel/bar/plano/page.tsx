import { TRIAL_ENDING_SOON_DAYS } from "@eaimesa/shared";
import { BillingPanel } from "../../../../components/billing-panel";

export const metadata = { title: "Plano e pagamentos" };

export default function BarPlanoPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Plano e pagamentos</h2>
      <p className="mt-2 mb-8 text-ink-soft">
        Escolha o plano e o meio (cartão ou PIX). No trial o aviso aparece nos últimos{" "}
        {TRIAL_ENDING_SOON_DAYS} dias. Os 30 dias do plano somam no fim do trial ou da vigência atual —
        pagar cedo não queima o que ainda resta.
      </p>
      <BillingPanel />
    </div>
  );
}
