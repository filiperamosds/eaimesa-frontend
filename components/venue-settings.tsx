"use client";

import { ERROR_CODES, slugifyFromName, withSlugSuffix } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useMenuSlugFromName } from "../lib/menu-slug";
import type { Venue } from "../lib/types";

export function VenueSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const derivedSlug = useMenuSlugFromName(name, venue?.slug ?? null);
  const [nameTouched, setNameTouched] = useState(false);
  const slug = venue && !nameTouched ? venue.slug : derivedSlug;

  useEffect(() => {
    api<Venue>("/v1/owner/venue").then((v) => {
      setVenue(v);
      setName(v.name);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      let nextSlug = slug;
      let v: Venue | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          v = await api<Venue>("/v1/owner/venue", {
            method: "PATCH",
            body: JSON.stringify({ name, slug: nextSlug }),
          });
          break;
        } catch (err) {
          const taken = err instanceof ApiError && err.code === ERROR_CODES.SLUG_TAKEN;
          if (!taken || attempt === 7) throw err;
          nextSlug = withSlugSuffix(slugifyFromName(name), attempt + 2);
        }
      }
      if (!v) throw new Error("Não foi possível salvar.");
      setVenue(v);
      setName(v.name);
      setNameTouched(false);
      setMsg("Salvo.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (!venue) return <p className="text-ink-soft">Carregando…</p>;

  return (
    <div className="max-w-lg space-y-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            className="field"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL do cardápio</span>
          <input value={slug} className="field" disabled readOnly />
          <p className="mt-1 text-xs text-ink-soft">Cardápio em /{slug}</p>
        </label>
        {error ? <p className="text-sm text-chili">{error}</p> : null}
        {msg ? <p className="text-sm text-sage">{msg}</p> : null}
        <button type="submit" disabled={pending} className="btn-primary !py-2">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
