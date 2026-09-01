import { Suspense } from "react";
import { ReportsTabs } from "../../../../../components/reports-tabs";

export const metadata = { title: "Comandas — Relatórios" };

export default function RelatoriosComandasPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsTabs />
    </Suspense>
  );
}
