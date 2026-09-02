"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { planFeatureMessage } from "../lib/finance-labels";
import { useFinanceQuery } from "./finance-period";

type Session = {
  id: string;
  status: string;
  openingFloatCents: number;
  openedAt: string | null;
  closedAt: string | null;
  expectedByMethod: Record<string, number> | null;
  countedByMethod: Record<string, number> | null;
  differenceCents: number | null;
  movementsCents?: { sangria: number; suprimento: number; ajuste: number };
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ReportsCash() {
  const { qs } = useFinanceQuery();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api<{ sessions: Session[] }>(`/v1/owner/cash-sessions?${qs}`);
      setSessions(d.sessions);
    } catch (err) {
      setError(err instanceof ApiError ? planFeatureMessage(err.code, err.message) : "Falha ao carregar.");
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl">Turnos de caixa</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Histórico. O turno ao vivo continua em Caixa.
        </p>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {!sessions && !error ? <p className="text-ink-soft">Carregando…</p> : null}
      {sessions ? (
        sessions.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum turno aberto neste período.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const diff = s.differenceCents ?? 0;
              const mv = s.movementsCents;
              return (
                <li key={s.id} className="surface p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {s.status === "open" ? "Aberto" : "Fechado"} · fundo {formatBrlFromCents(s.openingFloatCents)}
                    </p>
                    {s.status === "closed" ? (
                      <span className={`tabular-nums font-medium ${diff === 0 ? "text-sage" : "text-chili"}`}>
                        {diff === 0
                          ? "Bateu"
                          : diff > 0
                            ? `Sobra ${formatBrlFromCents(diff)}`
                            : `Quebra ${formatBrlFromCents(Math.abs(diff))}`}
                      </span>
                    ) : (
                      <span className="text-ink-soft">Em andamento</span>
                    )}
                  </div>
                  <p className="mt-1 text-ink-soft">
                    Abriu {formatWhen(s.openedAt)}
                    {s.closedAt ? ` · fechou ${formatWhen(s.closedAt)}` : ""}
                  </p>
                  {mv && (mv.sangria > 0 || mv.suprimento > 0 || mv.ajuste !== 0) ? (
                    <p className="mt-2 text-xs text-ink-soft">
                      Sangria {formatBrlFromCents(mv.sangria)} · suprimento {formatBrlFromCents(mv.suprimento)}
                      {mv.ajuste ? ` · ajuste ${formatBrlFromCents(mv.ajuste)}` : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
