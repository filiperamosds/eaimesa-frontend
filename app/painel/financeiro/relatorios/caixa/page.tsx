import { Suspense } from "react";
import { ReportsCash } from "../../../../../components/reports-cash";

export const metadata = { title: "Turnos — Relatórios" };

export default function RelatoriosCaixaPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsCash />
    </Suspense>
  );
}
