import { StaffEditor } from "../../../../components/staff-editor";

export const metadata = { title: "Equipe" };

export default function ConfigEquipePage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Equipe</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Garçom gera o QR da comanda. Caixa vê a mesma tela em /garcom. Painel é o monitor da
        cozinha ou do bar: só o Kanban, com as categorias que o dono marcar.
      </p>
      <StaffEditor />
    </div>
  );
}
