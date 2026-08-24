import { ConfiguracoesNav } from "../../../components/configuracoes-nav";

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="eyebrow">Painel</p>
        <h1 className="mt-2 font-serif text-3xl">Configurações</h1>
        <div className="mt-6 rounded-2xl bg-paper-2/80 p-1">
          <ConfiguracoesNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
