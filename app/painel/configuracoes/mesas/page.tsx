import { TablesEditor } from "../../../../components/tables-editor";

export const metadata = { title: "Mesas" };

export default function ConfigMesasPage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Mesas</h2>
      <TablesEditor showVenueQr />
    </div>
  );
}
