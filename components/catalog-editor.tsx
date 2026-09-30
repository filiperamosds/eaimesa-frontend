"use client";

import { formatBrlFromCents, venueHasModule, type RecipeLine, type StockItem } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { mediaSrc } from "../lib/media";
import type { CatalogCategory, Session } from "../lib/types";
import { ItemCreateDialog } from "./item-create-dialog";
import { ItemEditDialog } from "./item-edit-dialog";

function moveRow<T>(rows: T[], from: number, dir: -1 | 1): T[] | null {
  const to = from + dir;
  if (to < 0 || to >= rows.length) return null;
  const next = [...rows];
  const row = next.splice(from, 1)[0];
  if (row === undefined) return null;
  next.splice(to, 0, row);
  return next;
}

async function persistSort(path: string, rows: { id: string }[]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    await api(`${path}/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ sortOrder: i }),
    });
  }
}

function OrderButtons({
  label,
  canUp,
  canDown,
  disabled,
  onUp,
  onDown,
}: {
  label: string;
  canUp: boolean;
  canDown: boolean;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const btn =
    "rounded-md px-1.5 py-0.5 text-xs leading-none text-ink-soft hover:bg-paper-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  return (
    <span className="inline-flex shrink-0 flex-col">
      <button type="button" className={btn} disabled={disabled || !canUp} aria-label={`Subir ${label}`} onClick={onUp}>
        ▲
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || !canDown}
        aria-label={`Descer ${label}`}
        onClick={onDown}
      >
        ▼
      </button>
    </span>
  );
}

export function CatalogEditor({ onCategories }: { onCategories?: (rows: CatalogCategory[]) => void }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState(false);
  const [ordering, setOrdering] = useState(false);
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
    onCategories?.(data.categories);
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

  async function moveCategory(from: number, dir: -1 | 1) {
    const next = moveRow(categories, from, dir);
    if (!next || sorting) return;
    setSorting(true);
    setError(null);
    setCategories(next);
    onCategories?.(next);
    try {
      await persistSort("/v1/owner/catalog/categories", next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reordenar as categorias.");
    } finally {
      await load().catch(() => undefined);
      setSorting(false);
    }
  }

  async function moveItem(categoryId: string, from: number, dir: -1 | 1) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || sorting) return;
    const items = moveRow(cat.items, from, dir);
    if (!items) return;
    const next = categories.map((c) => (c.id === categoryId ? { ...c, items } : c));
    setSorting(true);
    setError(null);
    setCategories(next);
    onCategories?.(next);
    try {
      await persistSort("/v1/owner/catalog/items", items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reordenar os itens.");
    } finally {
      await load().catch(() => undefined);
      setSorting(false);
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
        {categories.length > 0 ? (
          <button
            type="button"
            className="btn-secondary !py-2 text-sm"
            onClick={() => setOrdering((on) => !on)}
          >
            {ordering ? "Concluir posições" : "Editar posições"}
          </button>
        ) : null}
      </form>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {categories.length === 0 ? (
        <p className="text-ink-soft">Nenhuma categoria ainda. Comece por Petiscos, Porções, Bebidas.</p>
      ) : ordering ? (
        <p className="text-sm text-ink-soft">
          Use as setas para definir quem aparece primeiro no cardápio público — categorias e itens.
        </p>
      ) : null}
      {categories.map((cat, index) => (
        <CategoryBlock
          key={cat.id}
          category={cat}
          index={index}
          total={categories.length}
          sorting={sorting}
          ordering={ordering}
          onMove={(dir) => void moveCategory(index, dir)}
          onMoveItem={(from, dir) => void moveItem(cat.id, from, dir)}
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
  index,
  total,
  sorting,
  ordering,
  onMove,
  onMoveItem,
  onChange,
  onError,
  inventoryOn,
  stockItems,
  recipes,
}: {
  category: CatalogCategory;
  index: number;
  total: number;
  sorting: boolean;
  ordering: boolean;
  onMove: (dir: -1 | 1) => void;
  onMoveItem: (from: number, dir: -1 | 1) => void;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
  inventoryOn: boolean;
  stockItems: StockItem[];
  recipes: Record<string, RecipeLine[]>;
}) {
  const [name, setName] = useState(category.name);
  const [editingName, setEditingName] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      onError("Nome da categoria não pode ficar vazio.");
      setName(category.name);
      setEditingName(false);
      return;
    }
    if (trimmed === category.name) {
      setEditingName(false);
      return;
    }
    onError(null);
    try {
      await api(`/v1/owner/catalog/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setEditingName(false);
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar categoria.");
    }
  }

  function cancelName() {
    setName(category.name);
    setEditingName(false);
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

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {ordering ? (
          <OrderButtons
            label={`categoria ${category.name}`}
            canUp={index > 0}
            canDown={index < total - 1}
            disabled={sorting}
            onUp={() => onMove(-1)}
            onDown={() => onMove(1)}
          />
        ) : null}
        {editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveName();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelName();
              }
            }}
            className="field min-w-40 flex-1 font-serif text-2xl"
            autoFocus
            aria-label="Nome da categoria"
          />
        ) : (
          <h3 className="min-w-0 flex-1 font-serif text-2xl">{category.name}</h3>
        )}
        <span className={`text-xs ${category.active ? "text-sage" : "text-ink-soft"}`}>
          {category.active ? "visível" : "oculta"}
        </span>
        {editingName ? (
          <button
            type="button"
            className="text-sm text-ink-soft hover:text-ink"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelName}
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            className="ml-auto text-sm text-ink-soft hover:text-ink"
            onClick={() => {
              setName(category.name);
              setEditingName(true);
            }}
          >
            Editar
          </button>
        )}
        <button type="button" onClick={toggleActive} className="text-sm text-ink-soft hover:text-ink">
          {category.active ? "Ocultar" : "Mostrar"}
        </button>
        <button type="button" onClick={remove} className="text-sm text-chili">
          Excluir
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {category.items.map((item, itemIndex) => (
          <ItemRow
            key={item.id}
            item={item}
            index={itemIndex}
            total={category.items.length}
            sorting={sorting}
            ordering={ordering}
            onMove={(dir) => onMoveItem(itemIndex, dir)}
            onChange={onChange}
            onError={onError}
            inventoryOn={inventoryOn}
            stockItems={stockItems}
            recipe={recipes[item.id] ?? []}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="btn-secondary mt-4 py-2 text-sm"
      >
        Adicionar item
      </button>
      {creating ? (
        <ItemCreateDialog
          categoryId={category.id}
          sortOrder={category.items.length}
          onSaved={onChange}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </section>
  );
}

function ItemRow({
  item,
  index,
  total,
  sorting,
  ordering,
  onMove,
  onChange,
  onError,
  inventoryOn,
  stockItems,
  recipe,
}: {
  item: CatalogCategory["items"][number];
  index: number;
  total: number;
  sorting: boolean;
  ordering: boolean;
  onMove: (dir: -1 | 1) => void;
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
          {ordering ? (
            <OrderButtons
              label={`item ${item.name}`}
              canUp={index > 0}
              canDown={index < total - 1}
              disabled={sorting}
              onUp={() => onMove(-1)}
              onDown={() => onMove(1)}
            />
          ) : null}
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
            {(item.modifierGroups ?? []).length > 0 ? (
              <p className="text-xs text-ink-soft">
                {(item.modifierGroups ?? []).map((g) => g.name).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="tabular-nums font-medium">{formatBrlFromCents(item.priceCents)}</span>
          {item.offerPriceCents != null && item.offerPriceCents < item.priceCents ? (
            <span className="text-xs text-chili">oferta {formatBrlFromCents(item.offerPriceCents)}</span>
          ) : null}
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
