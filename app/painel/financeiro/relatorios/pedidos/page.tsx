import { Suspense } from "react";
import { ReportsOrders } from "../../../../../components/reports-orders";

export const metadata = { title: "Pedidos — Relatórios" };

export default function RelatoriosPedidosPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Carregando…</p>}>
      <ReportsOrders />
    </Suspense>
  );
}
