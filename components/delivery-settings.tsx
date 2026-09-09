"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Session } from "../lib/types";
import { MoneyField } from "./masked-fields";

type OwnerModule = {
  key: string;
  name: string;
  enabled: boolean;
  editable: boolean;
  config: Record<string, unknown>;
};

export function DeliverySettings() {
  const [loading, setLoading] = useState(true);
  const [onPlan, setOnPlan] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [feeCents, setFeeCents] = useState(0);
  const [eta, setEta] = useState("");
  const [printFullReceipt, setPrintFullReceipt] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ modules: OwnerModule[] }>("/v1/owner/modules"),
      api<Session>("/v1/auth/me"),
    ])
      .then(([mods, session]) => {
        const row = mods.modules.find((m) => m.key === "delivery");
        setOnPlan(Boolean(row));
        if (row) {
          setEnabled(row.enabled);
          const fee = row.config?.feeCents;
          setFeeCents(typeof fee === "number" ? fee : 0);
          const minutes = row.config?.etaMinutes;
          setEta(typeof minutes === "number" ? String(minutes) : "");
          setPrintFullReceipt(row.config?.printFullReceipt === true);
        }
        setSlug(session.venue.slug);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const fee = Math.min(50_000, Math.max(0, feeCents));
    const etaRaw = eta.trim();
    const etaMinutes = etaRaw === "" ? null : Math.round(Number(etaRaw));
    try {
      await api("/v1/owner/modules/delivery", {
        method: "PATCH",
        body: JSON.stringify({
          enabled,
          config: { feeCents: fee, etaMinutes, printFullReceipt },
        }),
      });
      setFeeCents(fee);
      setMsg(
        enabled
          ? "Salvo. O link de delivery aparece no cardápio público."
          : "Salvo. Delivery desligado.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (loading && !error) return <p className="text-ink-soft">Carregando…</p>;
  if (!onPlan) {
    return <p className="text-ink-soft">Delivery não está no seu plano.</p>;
  }

  const publicPath = slug ? `/${slug}/delivery` : null;

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
          <span className="block font-medium">Aceitar delivery</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Cliente pede em {publicPath ?? "/{slug}/delivery"} sem mesa e sem cadastro. O pedido
            cai no Kanban. Pagamento na entrega (Pix ou dinheiro).
          </span>
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Taxa de entrega</span>
        <MoneyField cents={feeCents} onCentsChange={(c) => setFeeCents(c ?? 0)} />
        <span className="mt-1 block text-xs text-ink-soft">Até R$ 500. Zero = grátis.</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Previsão (minutos)</span>
        <input
          className="field"
          inputMode="numeric"
          placeholder="Opcional"
          min={10}
          max={180}
          value={eta}
          onChange={(e) => setEta(e.target.value.replace(/\D/g, ""))}
        />
        <span className="mt-1 block text-xs text-ink-soft">Vazio esconde o tempo. Entre 10 e 180.</span>
      </label>
      <label className="surface flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-chili"
          checked={printFullReceipt}
          onChange={(e) => setPrintFullReceipt(e.target.checked)}
        />
        <span>
          <span className="block font-medium">Imprimir nota completa para o entregador</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Sai junto com as vias dos itens. Parece a comanda fechada — itens, endereço, WhatsApp e
            total — sem taxa de serviço. Pregue no pedido.
          </span>
        </span>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
