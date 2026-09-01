import { Suspense } from "react";
import { ReportsNav } from "../../../../components/reports-nav";

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ReportsNav />
      </Suspense>
      {children}
    </div>
  );
}
