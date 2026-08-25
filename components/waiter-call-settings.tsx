"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../lib/api";
import { pickBool } from "../lib/api-case";
import type { Venue } from "../lib/types";

const TTL_MIN = 15;
const TTL_MAX = 480;
const TTL_DEFAULT = 120;

function readWaiterFlag(v: Venue): boolean {
  const o = v as Venue & Record<string, unknown>;
  return Boolean(pickBool(o, "waiterCallEnabled", "waiter_call_enabled") ?? v.waiterCallEnabled);
}

function readTtl(v: Venue): number {
  const o = v as Venue & Record<string, unknown>;
  const n = o.waiterCallTtlMinutes ?? o.waiter_call_ttl_minutes;
  return typeof n === "number" && n >= TTL_MIN ? n : TTL_DEFAULT;
}

export function WaiterCallSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ttl, setTtl] = useState(TTL_DEFAULT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Venue>("/v1/owner/venue")
      .then((v) => {
        setVenue(v);
        setEnabled(readWaiterFlag(v));
        setTtl(readTtl(v));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const minutes = Math.min(TTL_MAX, Math.max(TTL_MIN, Math.round(ttl)));
    setPending(true);
    try {
      const v = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({
          waiterCallEnabled: enabled,
          waiterCallTtlMinutes: minutes,
        }),
      });
      setVenue(v);
      setEnabled(readWaiterFlag(v));
      setTtl(readTtl(v));
      setMsg(
        enabled
          ? "Salvo. O botão aparece quando o cliente escaneia o QR da mesa — o QR geral não mostra o botão."
          : "Salvo. Chamada desligada no cardápio.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar.",
      );
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
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          <span className="block font-medium">Chamar garçom pelo cardápio</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Com o QR da mesa, o cliente pode pedir atendimento. Desligado: o QR ainda abre o cardápio,
            sem botão de chamar.
          </span>
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Validade da sessão no celular (minutos)</span>
        <input
          type="number"
          className="field max-w-[10rem]"
          min={TTL_MIN}
          max={TTL_MAX}
          step={1}
          value={ttl}
          disabled={!enabled}
          onChange={(e) => setTtl(Number(e.target.value) || TTL_DEFAULT)}
        />
        <span className="mt-1 block text-xs text-ink-soft">
          Entre {TTL_MIN} e {TTL_MAX}. Depois disso o cliente precisa escanear de novo.
        </span>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary !py-2">
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/painel/chamados" className="text-sm font-medium text-chili">
          Ver fila de chamados →
        </Link>
      </div>
    </form>
  );
}
