"use client";

import { type RecipeLine, type StockItem } from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, apiUpload } from "../lib/api";
import { mediaSrc } from "../lib/media";
import type { CatalogItem } from "../lib/types";
import { ItemRecipeEditor } from "./item-recipe-editor";
import { MoneyField } from "./masked-fields";

export function ItemEditDialog({
  item,
  inventoryOn,
  stockItems,
  recipe,
  onSaved,
  onClose,
}: {
  item: CatalogItem;
  inventoryOn: boolean;
  stockItems: StockItem[];
  recipe: RecipeLine[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [priceCents, setPriceCents] = useState<number | null>(item.priceCents);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<RecipeLine[]>(recipe);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoPreview = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile);
    return mediaSrc(item.imageUrl);
  }, [photoFile, item.imageUrl]);

  useEffect(() => {
    if (!photoFile || !photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoFile, photoPreview]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cents = priceCents;
    if (cents === null) {
      setError("Informe o preço (ex. R$ 12,50).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api(`/v1/owner/catalog/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description: description || null, priceCents: cents }),
      });
      if (photoFile) {
        await apiUpload(`/v1/owner/catalog/items/${item.id}/image`, photoFile);
      }
      if (inventoryOn) {
        await api(`/v1/owner/catalog/items/${item.id}/recipe`, {
          method: "PUT",
          body: JSON.stringify({
            lines: draftRecipe
              .filter((l) => l.stockItemId && l.qty > 0)
              .map((l) => ({ stockItemId: l.stockItemId, qty: l.qty })),
          }),
        });
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-edit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={(e) => void save(e)}
        className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5"
      >
        <p className="eyebrow">Cardápio</p>
        <h2 id="item-edit-title" className="mt-2 font-serif text-2xl">
          Editar item
        </h2>
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-[10px] text-ink-soft">
                sem foto
              </span>
            )}
            <label className="cursor-pointer text-sm text-ink-soft hover:text-ink">
              {photoFile ? photoFile.name : "Trocar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="field"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            rows={4}
            maxLength={280}
            className="field"
          />
          <MoneyField cents={priceCents} onCentsChange={setPriceCents} className="field" required />
          {inventoryOn ? (
            <ItemRecipeEditor stockItems={stockItems} lines={draftRecipe} onChange={setDraftRecipe} />
          ) : null}
          {error ? <p className="text-sm text-chili">{error}</p> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost !py-2 text-sm"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary !py-2 text-sm" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
