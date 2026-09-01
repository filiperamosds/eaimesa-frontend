import { Suspense } from "react";
import { ReportsTeam } from "../../../../../components/reports-team";

export const metadata = { title: "Equipe — Relatórios" };

export default function RelatoriosEquipePage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsTeam />
    </Suspense>
  );
}
