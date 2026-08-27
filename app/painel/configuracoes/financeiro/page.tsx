import Link from "next/link";
import { ServiceFeeSettings } from "../../../../components/service-fee-settings";

export const metadata = { title: "Financeiro" };

export default function ConfigFinanceiroPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Financeiro</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Configure a taxa de serviço aplicada no fechamento das comandas. Os relatórios ficam em{" "}
        <Link href="/painel/financeiro" className="font-medium text-chili underline">
          Financeiro
        </Link>
        .
      </p>
      <ServiceFeeSettings />
    </div>
  );
}
