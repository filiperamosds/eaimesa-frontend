"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

type OwnerModule = {
  key: string;
  name: string;
  enabled: boolean;
  editable: boolean;
  config: Record<string, unknown>;
};

export function ServiceFeeSettings() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState(10);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ modules: OwnerModule[] }>("/v1/owner/modules")
      .then((d) => {
        const fee = d.modules.find((m) => m.key === "service_fee");
        if (!fee) {
          setAvailable(false);
          return;
        }
        setAvailable(true);
        setEnabled(fee.enabled);
        const p = fee.config?.percent;
        setPercent(typeof p === "number" ? p : 10);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    try {
      await api("/v1/owner/modules/service_fee", {
        method: "PATCH",
        body: JSON.stringify({ enabled, config: { percent: p } }),
      });
      setPercent(p);
      setMsg(
        enabled
          ? `Salvo. A taxa de ${p}% entra no total devido do fechamento das comandas.`
          : "Salvo. Taxa de serviço desligada.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (available === false) {
    return <p className="text-ink-soft">Taxa de serviço não está no seu plano.</p>;
  }
  if (available === null && !error) return <p className="text-ink-soft">Carregando…</p>;

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
          <span className="block font-medium">Cobrar taxa de serviço</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Quando ligada, a taxa entra no total devido no fechamento da comanda. O caixa ainda pode
            dar desconto ou cortesia.
          </span>
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Percentual (%)</span>
        <input
          type="number"
          className="field max-w-[8rem]"
          min={0}
          max={100}
          step={1}
          value={percent}
          disabled={!enabled}
          onChange={(e) => setPercent(Number(e.target.value) || 0)}
        />
        <span className="mt-1 block text-xs text-ink-soft">Comum: 10%. Entre 0 e 100.</span>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary !py-2">
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
