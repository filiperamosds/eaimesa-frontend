import { StaffEditor } from "../../../../components/staff-editor";

export const metadata = { title: "Equipe" };

export default function BarEquipePage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Equipe</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Garçom gera o QR da comanda. Caixa vê a mesma tela em /garcom e sempre pode encerrar contas.
      </p>
      <StaffEditor />
    </div>
  );
}
