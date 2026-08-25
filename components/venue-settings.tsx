"use client";

import { planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";
import { MenuQrModal } from "./menu-qr-modal";

export function VenueSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    api<Venue>("/v1/owner/venue").then((v) => {
      setVenue(v);
      setName(v.name);
      setSlug(v.slug);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const v = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ name, slug }),
      });
      setVenue(v);
      setMsg("Salvo. A URL pública do cardápio mudou se você alterou o slug.");
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
            onChange={(e) => setName(e.target.value)}
            className="field"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL do cardápio</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="field"
            required
          />
          <p className="mt-1 text-xs text-ink-soft">
            Cardápio em /{slug}
          </p>
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
