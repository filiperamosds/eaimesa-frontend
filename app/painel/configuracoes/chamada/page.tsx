import Link from "next/link";
import { WaiterCallSettings } from "../../../../components/waiter-call-settings";

export const metadata = { title: "Chamada ao garçom" };

export default function ConfigChamadaPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Chamada ao garçom</h2>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Liga ou desliga o botão no cardápio depois do cliente escanear o QR da mesa. Cadastre as mesas
        em{" "}
        <Link href="/painel/configuracoes/mesas" className="font-medium text-chili underline">
          Mesas
        </Link>
        .
      </p>
      <WaiterCallSettings />
    </div>
  );
}
