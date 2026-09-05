import { FinanceSettings } from "../../../../components/finance-settings";

export const metadata = { title: "Financeiro" };

export default function ConfigFinanceiroPage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Financeiro</h2>
      <FinanceSettings />
    </div>
  );
}
