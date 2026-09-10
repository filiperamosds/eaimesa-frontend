"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, Session } from "../lib/types";
import { CatalogEditor } from "./catalog-editor";
import { HappyHourEditor } from "./happy-hour-editor";

export function CatalogSettings() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [dark, setDark] = useState(false);
  const [modern, setModern] = useState(false);
  const [saving, setSaving] = useState<"dark" | "modern" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Session>("/v1/auth/me")
      .then((s) => {
        setDark(Boolean(s.venue.catalogDark));
        setModern(Boolean(s.venue.catalogModern));
      })
      .catch(() => undefined);
  }, []);

  async function patchVenue(body: { catalogDark?: boolean; catalogModern?: boolean }) {
    setError(null);
    await api("/v1/owner/venue", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async function toggleDark() {
    const next = !dark;
    setDark(next);
    setSaving("dark");
    try {
      await patchVenue({ catalogDark: next });
    } catch (err) {
      setDark(!next);
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o tema.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleModern() {
    const next = !modern;
    setModern(next);
    setSaving("modern");
    try {
      await patchVenue({ catalogModern: next });
    } catch (err) {
      setModern(!next);
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o estilo.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Cardápio</h2>
        <div className="flex flex-wrap items-center gap-5">
          <FlagSwitch
            offLabel="Claro"
            onLabel="Escuro"
            checked={dark}
            disabled={saving !== null}
            ariaLabel="Tema do cardápio público"
            onToggle={() => void toggleDark()}
          />
          <FlagSwitch
            offLabel="Clássico"
            onLabel="Moderno"
            checked={modern}
            disabled={saving !== null}
            ariaLabel="Estilo do cardápio da mesa"
            onToggle={() => void toggleModern()}
          />
        </div>
      </div>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      <CatalogEditor onCategories={setCategories} />
      <HappyHourEditor categories={categories} />
    </>
  );
}

function FlagSwitch({
  offLabel,
  onLabel,
  checked,
  disabled,
  ariaLabel,
  onToggle,
}: {
  offLabel: string;
  onLabel: string;
  checked: boolean;
  disabled: boolean;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink-soft">
      <span className="min-w-[4.5rem] text-right font-medium text-ink">{checked ? onLabel : offLabel}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-chili" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-[left] ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
