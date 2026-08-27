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

export function RequireOpenCashSettings() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [requireOpenCash, setRequireOpenCash] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ modules: OwnerModule[] }>("/v1/owner/modules")
      .then((d) => {
        const finance = d.modules.find((m) => m.key === "finance");
        if (!finance) {
          setAvailable(false);
          return;
        }
        setAvailable(true);
        setRequireOpenCash(finance.config?.requireOpenCash === true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    try {
      await api("/v1/owner/modules/finance", {
        method: "PATCH",
        body: JSON.stringify({ config: { requireOpenCash } }),
      });
      setMsg(
        requireOpenCash
          ? "Salvo. Sem caixa aberto o salão não gera QR nem lança pedido."
          : "Salvo. Pedidos e QR funcionam mesmo com o caixa fechado.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (available === false) {
    return <p className="text-ink-soft">Financeiro não está no seu plano.</p>;
  }
  if (available === null && !error) return <p className="text-ink-soft">Carregando…</p>;

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-5">
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
            Bloqueia gerar o QR da mesa e lançar pedidos (garçom, dono e cliente) enquanto não houver
            um caixa aberto no turno.
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
