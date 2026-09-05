import { WaiterCallSettings } from "../../../../components/waiter-call-settings";

export const metadata = { title: "Chamada ao garçom" };

export default function ConfigChamadaPage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Chamada ao garçom</h2>
      <WaiterCallSettings />
    </div>
  );
}
