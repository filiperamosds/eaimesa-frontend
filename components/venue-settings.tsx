"use client";

import { ERROR_CODES, planAllowsService, slugifyFromName, withSlugSuffix } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useMenuSlugFromName } from "../lib/menu-slug";
import type { Venue } from "../lib/types";
import { MenuQrModal } from "./menu-qr-modal";

export function VenueSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showQr, setShowQr] = useState(false);
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

  const service = planAllowsService(venue.planKind ?? venue.plan);

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

      <section className="surface p-5">
        <p className="eyebrow">QR e mesas</p>
        <h2 className="mt-2 font-serif text-xl">Salão e adesivos</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Cadastre as mesas e exporte o QR em{" "}
          <Link href="/painel/configuracoes/mesas" className="font-medium text-chili underline">
            Mesas
          </Link>
          .{" "}
          {service
            ? "QR fixo abre o cardápio; comanda continua com o QR do garçom."
            : "No Cardápio o QR da mesa identifica o lugar para a chamada."}{" "}
          QR geral (porta / Instagram):{" "}
          <span className="font-medium text-ink">/{venue.slug}</span>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/painel/configuracoes/mesas" className="btn-primary !py-2 text-sm">
            Cadastrar mesas
          </Link>
          {!service ? (
            <Link href="/painel/configuracoes/chamada" className="btn-secondary !py-2 text-sm">
              Chamada ao garçom
            </Link>
          ) : null}
          <button type="button" onClick={() => setShowQr(true)} className="btn-secondary !py-2 text-sm">
            QR geral
          </button>
        </div>
      </section>

      {showQr ? (
        <MenuQrModal
          slug={venue.slug}
          venueName={venue.name}
          onClose={() => setShowQr(false)}
        />
      ) : null}
    </div>
  );
}
