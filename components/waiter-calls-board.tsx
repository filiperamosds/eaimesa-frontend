"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { WaiterCall } from "../lib/types";

const POLL_MS = 5000;

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WaiterCallsBoard() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<WaiterCall[] | { calls: WaiterCall[] }>(
        "/v1/owner/waiter-calls?status=open",
      );
      const list = Array.isArray(data) ? data : data.calls;
      setCalls(list ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os chamados.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  async function ack(id: string) {
    setError(null);
    try {
      await api(`/v1/owner/waiter-calls/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "acked" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao marcar como atendido.");
    }
  }

  if (loading) {
    return (
      <div>
        <CallsHeader onRefresh={() => void load()} />
        <p className="text-ink-soft">Carregando chamados…</p>
      </div>
    );
  }

  return (
    <div>
      <CallsHeader onRefresh={() => void load()} />
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      {calls.length === 0 ? (
        <p className="surface p-8 text-center text-ink-soft">Nenhum chamado aberto.</p>
      ) : (
        <ul className="space-y-3">
          {calls.map((c) => (
            <li
              key={c.id}
              className="surface flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-serif text-xl">{c.tableLabel}</p>
                <p className="mt-1 text-sm text-ink-soft">às {formatWhen(c.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => void ack(c.id)}
                className="btn-primary !py-2 text-sm"
              >
                Atendido
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CallsHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-3">
      <h1 className="font-serif text-3xl">Chamados</h1>
      <button type="button" onClick={onRefresh} className="text-sm font-medium text-chili">
        Atualizar agora
      </button>
    </div>
  );
}
