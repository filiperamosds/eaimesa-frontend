"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";

export function VenueCloseSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [staffCanCloseTabs, setStaffCanCloseTabs] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Venue>("/v1/owner/venue")
      .then((v) => {
        setVenue(v);
        setStaffCanCloseTabs(v.staffCanCloseTabs !== false);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const v = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ staffCanCloseTabs }),
      });
      setVenue(v);
      setStaffCanCloseTabs(v.staffCanCloseTabs !== false);
      setMsg("Salvo.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (!venue && !error) return <p className="text-ink-soft">Carregando…</p>;

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-5">
      <label className="surface flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-chili"
          checked={staffCanCloseTabs}
          onChange={(e) => setStaffCanCloseTabs(e.target.checked)}
        />
        <span>
          <span className="block font-medium">Garçom pode encerrar comanda e mesa</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Desligado, só o caixa (e o dono em /garcom) fecha contas abertas. O garçom continua gerando
            QR e avançando a fila.
          </span>
        </span>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary !py-2">
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
