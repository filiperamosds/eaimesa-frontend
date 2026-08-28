import { Suspense } from "react";
import { CadastroScreen } from "../../components/cadastro-screen";

export const metadata = { title: "Cadastrar" };

export default function CadastroPage() {
  return (
    <Suspense fallback={<p className="p-8 text-ink-soft">Carregando…</p>}>
      <CadastroScreen />
    </Suspense>
  );
}
