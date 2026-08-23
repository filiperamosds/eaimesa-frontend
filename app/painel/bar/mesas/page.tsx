import { TablesEditor } from "../../../../components/tables-editor";

export const metadata = { title: "Mesas" };

export default function BarMesasPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Configuração de mesas</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Cadastre o salão e exporte o QR do cardápio (geral ou por mesa). O QR do garçom — que abre a
        comanda — é gerado em /garcom.
      </p>
      <TablesEditor showVenueQr />
    </div>
  );
}
