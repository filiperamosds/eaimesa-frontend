import Link from "next/link";
import { FinanceSettings } from "../../../../components/finance-settings";

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
      <FinanceSettings />
    </div>
  );
}
