import { StaffEditor } from "../../../../components/staff-editor";

export const metadata = { title: "Equipe" };

export default function ConfigEquipePage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Equipe</h2>
      <StaffEditor />
    </div>
  );
}
