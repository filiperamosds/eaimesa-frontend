"use client";

import { formatBrlFromCents, venueHasModule, type RecipeLine, type StockItem } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError, apiUpload } from "../lib/api";
import { mediaSrc } from "../lib/media";
import type { CatalogCategory, Session } from "../lib/types";
import { ItemEditDialog } from "./item-edit-dialog";
import { MoneyField } from "./masked-fields";

export function CatalogEditor() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [inventoryOn, setInventoryOn] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<Record<string, RecipeLine[]>>({});

  async function loadInventory() {
    const me = await api<Session>("/v1/auth/me");
    if (!venueHasModule(me.venue, "inventory")) {
      setInventoryOn(false);
      return;
    }
    setInventoryOn(true);
    const [stock, rec] = await Promise.all([
      api<{ items: StockItem[] }>("/v1/owner/stock/items"),
      api<{ recipes: { catalogItemId: string; lines: RecipeLine[] }[] }>("/v1/owner/stock/recipes"),
    ]);
    setStockItems(stock.items);
    const map: Record<string, RecipeLine[]> = {};
    for (const r of rec.recipes) map[r.catalogItemId] = r.lines;
    setRecipes(map);
  }

  async function load() {
    const data = await api<{ categories: CatalogCategory[] }>("/v1/owner/catalog");
    setCategories(data.categories);
    await loadInventory().catch(() => undefined);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/owner/catalog/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCat, sortOrder: categories.length }),
      });
      setNewCat("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando cardápio…</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={addCategory} className="flex flex-wrap gap-2">
        <input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="Nova categoria (ex. Petiscos)"
          className="field min-w-56 flex-1"
          required
        />
        <button type="submit" className="btn-primary !bg-sage !py-2 text-sm shadow-none">
          Adicionar categoria
        </button>
      </form>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {categories.length === 0 ? (
        <p className="text-ink-soft">Nenhuma categoria ainda. Comece por Petiscos, Porções, Bebidas.</p>
      ) : null}
      {categories.map((cat) => (
        <CategoryBlock
          key={cat.id}
          category={cat}
          onChange={load}
          onError={setError}
          inventoryOn={inventoryOn}
          stockItems={stockItems}
          recipes={recipes}
        />
      ))}
    </div>
  );
}

function CategoryBlock({
  category,
  onChange,
  onError,
  inventoryOn,
  stockItems,
  recipes,
}: {
  category: CatalogCategory;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
  inventoryOn: boolean;
  stockItems: StockItem[];
  recipes: Record<string, RecipeLine[]>;
}) {
  const [name, setName] = useState(category.name);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPriceCents, setItemPriceCents] = useState<number | null>(null);
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);

  async function saveName() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar categoria.");
    }
  }

  async function toggleActive() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !category.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar.");
    }
  }

  async function remove() {
    if (!confirm("Remover esta categoria? Só funciona se estiver sem itens.")) return;
    onError(null);
    try {
      await api(`/v1/owner/catalog/categories/${category.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const cents = itemPriceCents;
    if (cents === null) {
      onError("Informe o preço (ex. R$ 12,50).");
      return;
    }
    onError(null);
    try {
      const created = await api<{ id: string }>("/v1/owner/catalog/items", {
        method: "POST",
        body: JSON.stringify({
          categoryId: category.id,
          name: itemName,
          description: itemDesc || null,
          priceCents: cents,
          sortOrder: category.items.length,
        }),
      });
      if (itemPhoto) {
        await apiUpload(`/v1/owner/catalog/items/${created.id}/image`, itemPhoto);
      }
      setItemName("");
      setItemDesc("");
      setItemPriceCents(null);
      setItemPhoto(null);
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao criar item.");
    }
  }

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="font-serif text-2xl bg-transparent outline-none"
        />
        <span className={`text-xs ${category.active ? "text-sage" : "text-ink-soft"}`}>
          {category.active ? "visível" : "oculta"}
        </span>
        <button type="button" onClick={toggleActive} className="ml-auto text-sm text-ink-soft hover:text-ink">
          {category.active ? "Ocultar" : "Mostrar"}
        </button>
        <button type="button" onClick={remove} className="text-sm text-chili">
          Excluir
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {category.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onChange={onChange}
            onError={onError}
            inventoryOn={inventoryOn}
            stockItems={stockItems}
            recipe={recipes[item.id] ?? []}
          />
        ))}
      </ul>
      <form onSubmit={addItem} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Item"
          className="field"
          required
        />
        <MoneyField
          cents={itemPriceCents}
          onCentsChange={setItemPriceCents}
          className="field"
          required
        />
        <textarea
          value={itemDesc}
          onChange={(e) => setItemDesc(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={3}
          maxLength={280}
          className="field sm:col-span-2"
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setItemPhoto(e.target.files?.[0] ?? null)}
          className="field text-sm file:mr-2 file:rounded-full file:border-0 file:bg-paper-2 file:px-3 file:py-1 sm:col-span-2"
        />
        <button type="submit" className="btn-secondary py-2 text-sm sm:col-span-2">
          Adicionar item
        </button>
      </form>
    </section>
  );
}

function ItemRow({
  item,
  onChange,
  onError,
  inventoryOn,
  stockItems,
  recipe,
}: {
  item: CatalogCategory["items"][number];
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
  inventoryOn: boolean;
  stockItems: StockItem[];
  recipe: RecipeLine[];
}) {
  const [editing, setEditing] = useState(false);
  const photo = mediaSrc(item.imageUrl);

  async function toggle() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar item.");
    }
  }

  async function remove() {
    if (!confirm("Remover este item?")) return;
    onError(null);
    try {
      await api(`/v1/owner/catalog/items/${item.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao excluir.");
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {photo ? (
            <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-[10px] text-ink-soft">
              sem foto
            </span>
          )}
          <div>
            <p className={item.active ? "" : "text-ink-soft line-through"}>
              {item.name}
              {!item.active ? <span className="ml-2 text-xs">oculto</span> : null}
            </p>
            {item.description ? <p className="text-sm text-ink-soft">{item.description}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="tabular-nums font-medium">{formatBrlFromCents(item.priceCents)}</span>
          <button type="button" onClick={() => setEditing(true)} className="text-ink-soft hover:text-ink">
            Editar
          </button>
          <button type="button" onClick={toggle} className="text-ink-soft hover:text-ink">
            {item.active ? "Ocultar" : "Mostrar"}
          </button>
          <button type="button" onClick={remove} className="text-chili">
            Excluir
          </button>
        </div>
      </div>
      {editing ? (
        <ItemEditDialog
          item={item}
          inventoryOn={inventoryOn}
          stockItems={stockItems}
          recipe={recipe}
          onSaved={onChange}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </li>
  );
}
