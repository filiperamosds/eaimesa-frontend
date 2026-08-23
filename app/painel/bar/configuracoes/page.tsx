import { VenueCloseSettings } from "../../../../components/venue-close-settings";

export const metadata = { title: "Configurações" };

export default function BarConfigPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Configurações</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Regras do salão. O caixa não é afetado por este check — ele sempre pode fechar comanda e mesa.
      </p>
      <VenueCloseSettings />
    </div>
  );
}
