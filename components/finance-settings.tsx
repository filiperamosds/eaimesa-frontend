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

export function FinanceSettings() {
  const [loading, setLoading] = useState(true);
  const [financeOn, setFinanceOn] = useState(false);
  const [feeOn, setFeeOn] = useState(false);
  const [requireOpenCash, setRequireOpenCash] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [percent, setPercent] = useState(10);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ modules: OwnerModule[] }>("/v1/owner/modules")
      .then((d) => {
        const finance = d.modules.find((m) => m.key === "finance");
        const fee = d.modules.find((m) => m.key === "service_fee");
        setFinanceOn(Boolean(finance));
        setFeeOn(Boolean(fee));
        if (finance) setRequireOpenCash(finance.config?.requireOpenCash === true);
        if (fee) {
          setFeeEnabled(fee.enabled);
          const p = fee.config?.percent;
          setPercent(typeof p === "number" ? p : 10);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    try {
      const tasks: Promise<unknown>[] = [];
      if (financeOn) {
        tasks.push(
          api("/v1/owner/modules/finance", {
            method: "PATCH",
            body: JSON.stringify({ config: { requireOpenCash } }),
          }),
        );
      }
      if (feeOn) {
        tasks.push(
          api("/v1/owner/modules/service_fee", {
            method: "PATCH",
            body: JSON.stringify({ enabled: feeEnabled, config: { percent: p } }),
          }),
        );
      }
      await Promise.all(tasks);
      if (feeOn) setPercent(p);
      setMsg("Salvo.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (loading && !error) return <p className="text-ink-soft">Carregando…</p>;
  if (!financeOn && !feeOn) {
    return <p className="text-ink-soft">Financeiro não está no seu plano.</p>;
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-5">
      {financeOn ? (
        <label className="surface flex cursor-pointer items-start gap-3 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-chili"
            checked={requireOpenCash}
            onChange={(e) => setRequireOpenCash(e.target.checked)}
          />
          <span>
            <span className="block font-medium">Exigir caixa aberto</span>
            <span className="mt-1 block text-sm text-ink-soft">
              Bloqueia gerar o QR da mesa e lançar pedidos (garçom, dono e cliente) enquanto não
              houver um caixa aberto no turno.
            </span>
          </span>
        </label>
      ) : null}
      {feeOn ? (
        <>
          <label className="surface flex cursor-pointer items-start gap-3 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-chili"
              checked={feeEnabled}
              onChange={(e) => setFeeEnabled(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Cobrar taxa de serviço</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Quando ligada, a taxa entra na parcial, no cupom do garçom e no total devido no
                fechamento. O caixa ainda pode dar desconto ou cortesia.
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
              disabled={!feeEnabled}
              onChange={(e) => setPercent(Number(e.target.value) || 0)}
            />
            <span className="mt-1 block text-xs text-ink-soft">Comum: 10%. Entre 0 e 100.</span>
          </label>
        </>
      ) : null}
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary !py-2">
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
