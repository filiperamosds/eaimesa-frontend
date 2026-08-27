import Link from "next/link";
import { RequireOpenCashSettings } from "../../../../components/require-open-cash-settings";
import { ServiceFeeSettings } from "../../../../components/service-fee-settings";

export const metadata = { title: "Financeiro" };

export default function ConfigFinanceiroPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Financeiro</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Taxa de serviço no fechamento das comandas e regra do caixa no salão. Relatórios em{" "}
        <Link href="/painel/financeiro" className="font-medium text-chili underline">
          Financeiro
        </Link>
        .
      </p>
      <div className="space-y-10">
        <section>
          <h3 className="mb-4 font-serif text-xl">Caixa</h3>
          <RequireOpenCashSettings />
        </section>
        <section>
          <h3 className="mb-4 font-serif text-xl">Taxa de serviço</h3>
          <ServiceFeeSettings />
        </section>
      </div>
    </div>
  );
}
