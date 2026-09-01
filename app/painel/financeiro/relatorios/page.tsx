import { Suspense } from "react";
import { ReportsOverview } from "../../../../components/reports-overview";

export const metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsOverview />
    </Suspense>
  );
}
