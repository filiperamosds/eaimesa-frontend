import { TablesEditor } from "../../../../components/tables-editor";

export const metadata = { title: "Mesas" };

export default function ConfigMesasPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Mesas</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Cadastre o salão e exporte o QR (geral ou por mesa). No plano Cardápio o QR da mesa leva{" "}
        <span className="font-mono">?mesa=</span>; no Auto atendimento a comanda continua com o QR do
        garçom.
      </p>
      <TablesEditor showVenueQr />
    </div>
  );
}
