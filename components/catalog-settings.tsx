"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, Session } from "../lib/types";
import { CatalogEditor } from "./catalog-editor";
import { HappyHourEditor } from "./happy-hour-editor";

export function CatalogSettings() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [dark, setDark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Session>("/v1/auth/me")
      .then((s) => setDark(Boolean(s.venue.catalogDark)))
      .catch(() => undefined);
  }, []);

  async function toggleDark() {
    const next = !dark;
    setDark(next);
    setSaving(true);
    setError(null);
    try {
      await api("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ catalogDark: next }),
      });
    } catch (err) {
      setDark(!next);
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o tema.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Cardápio</h2>
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <span className="min-w-[3.25rem] text-right font-medium text-ink">{dark ? "Escuro" : "Claro"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label="Tema do cardápio público"
            disabled={saving}
            onClick={() => void toggleDark()}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              dark ? "bg-chili" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-[left] ${
                dark ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </div>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      <CatalogEditor onCategories={setCategories} />
      <HappyHourEditor categories={categories} />
    </>
  );
}
