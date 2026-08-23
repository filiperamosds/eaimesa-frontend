import { VenueSettings } from "../../../components/venue-settings";

export const metadata = { title: "Meu bar" };

export default function BarDadosPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Dados do bar</h2>
      <p className="mt-2 mb-8 text-ink-soft">
        O slug vira a rota pública. Exemplo: /bar-do-tiao. Palavras do produto (login, painel) não podem
        ser usadas.
      </p>
      <VenueSettings />
    </div>
  );
}
