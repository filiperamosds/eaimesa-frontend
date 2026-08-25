import { WaiterCallsBoard } from "../../../components/waiter-calls-board";

export const metadata = { title: "Chamados" };

export default function ChamadosPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Chamados</h1>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Mesas que pediram atendimento pelo cardápio (QR com <span className="font-mono">?mesa=</span>
        ).
      </p>
      <WaiterCallsBoard />
    </div>
  );
}
