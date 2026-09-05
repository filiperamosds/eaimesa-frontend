import { CatalogEditor } from "../../../../components/catalog-editor";

export const metadata = { title: "Cardápio" };

export default function ConfigCardapioPage() {
  return (
    <div>
      <h2 className="mb-8 font-serif text-2xl">Cardápio</h2>
      <CatalogEditor />
    </div>
  );
}
