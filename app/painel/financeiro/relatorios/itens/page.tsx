import { Suspense } from "react";
import { ReportsItems } from "../../../../../components/reports-items";

export const metadata = { title: "Itens — Relatórios" };

export default function RelatoriosItensPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsItems />
    </Suspense>
  );
}
