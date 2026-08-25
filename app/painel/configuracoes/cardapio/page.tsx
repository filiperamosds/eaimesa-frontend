import Link from "next/link";
import { CatalogEditor } from "../../../../components/catalog-editor";

export const metadata = { title: "Cardápio" };

export default function ConfigCardapioPage() {
  return (
    <div>
      <h2 className="font-serif text-2xl">Cardápio</h2>
      <p className="mt-2 mb-8 text-ink-soft">
        Categorias, itens e foto. Preço fica no servidor; o que estiver oculto não aparece na URL
        pública. Fila do turno:{" "}
        <Link href="/painel/pedidos" className="font-medium text-chili underline">
          Pedidos
        </Link>
        .
      </p>
      <CatalogEditor />
    </div>
  );
}
