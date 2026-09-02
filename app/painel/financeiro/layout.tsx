import { Suspense } from "react";
import { FinanceNav } from "../../../components/finance-nav";
import { FinancePeriodBar } from "../../../components/finance-period";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Financeiro</p>
        <h1 className="mt-2 font-serif text-3xl">Financeiro</h1>
      </div>
      <Suspense fallback={null}>
        <FinanceNav />
      </Suspense>
      <Suspense fallback={null}>
        <FinancePeriodBar />
      </Suspense>
      {children}
    </div>
  );
}
