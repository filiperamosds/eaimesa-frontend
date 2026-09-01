import { Suspense } from "react";
import { FinanceReport } from "../../../components/finance-report";

export const metadata = { title: "Faturamento" };

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <FinanceReport />
    </Suspense>
  );
}
