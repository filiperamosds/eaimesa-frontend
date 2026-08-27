"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { MoneyField } from "./masked-fields";

const STORAGE_KEY = "eaimesa_cash_session";

type MovementType = "sangria" | "suprimento" | "ajuste";
const MOVEMENT_LABEL: Record<MovementType, string> = {
  suprimento: "Suprimento (reforço)",
  sangria: "Sangria (retirada)",
  ajuste: "Ajuste",
};

type CountMethod = "cash" | "debit" | "credit" | "pix";
const COUNT_LABEL: Record<CountMethod, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
};

type CashSession = {
  id: string;
  status: string;
  openingFloatCents: number;
  differenceCents?: number | null;
  expectedByMethod?: Record<string, number> | null;
  countedByMethod?: Record<string, number> | null;
};

function loadStoredId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function CashRegisterPanel() {
  const [sessionId, setSessionId] = useState<string | null>(loadStoredId);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [mvType, setMvType] = useState<MovementType>("suprimento");
  const [mvAmount, setMvAmount] = useState(0);
  const [mvReason, setMvReason] = useState("");
  const [counted, setCounted] = useState<Record<CountMethod, number>>({ cash: 0, debit: 0, credit: 0, pix: 0 });
  const [closed, setClosed] = useState<CashSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function store(id: string | null) {
    setSessionId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  async function openCash() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const s = await api<CashSession>("/v1/staff/cash-sessions", {
        method: "POST",
        body: JSON.stringify({ openingFloatCents: openingFloat }),
      });
      store(s.id);
      setClosed(null);
      setMsg("Caixa aberto.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir o caixa.");
    } finally {
      setBusy(false);
    }
  }

  async function addMovement() {
    if (!sessionId || mvAmount <= 0) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api(`/v1/staff/cash-sessions/${sessionId}/movements`, {
        method: "POST",
        body: JSON.stringify({ type: mvType, amountCents: mvAmount, reason: mvReason || undefined }),
      });
      setMsg(`${MOVEMENT_LABEL[mvType]} de ${formatBrlFromCents(mvAmount)} registrada.`);
      setMvAmount(0);
      setMvReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }

  async function closeCash() {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const s = await api<CashSession>(`/v1/staff/cash-sessions/${sessionId}/close`, {
        method: "POST",
        body: JSON.stringify({ countedByMethod: counted }),
      });
      setClosed(s);
      store(null);
      setMsg("Caixa fechado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fechar o caixa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Caixa</p>
        <h1 className="mt-1 font-serif text-2xl">Fechamento de caixa</h1>
      </div>

      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}

      {!sessionId ? (
        <div className="surface space-y-4 p-5">
          <p className="font-medium">Abrir caixa</p>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Fundo de troco</span>
            <MoneyField className="field max-w-[10rem]" cents={openingFloat} onCentsChange={(c) => setOpeningFloat(c ?? 0)} />
          </label>
          <button type="button" onClick={() => void openCash()} disabled={busy} className="btn-primary !py-2 text-sm">
            {busy ? "Abrindo…" : "Abrir caixa"}
          </button>
        </div>
      ) : (
        <>
          <div className="surface space-y-3 p-5">
            <p className="font-medium">Movimentação</p>
            <div className="grid grid-cols-2 gap-2">
              <select className="field text-sm" value={mvType} onChange={(e) => setMvType(e.target.value as MovementType)}>
                {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => (
                  <option key={t} value={t}>
                    {MOVEMENT_LABEL[t]}
                  </option>
                ))}
              </select>
              <MoneyField className="field text-sm" cents={mvAmount} onCentsChange={(c) => setMvAmount(c ?? 0)} placeholder="Valor" />
            </div>
            <input
              className="field text-sm"
              value={mvReason}
              onChange={(e) => setMvReason(e.target.value)}
              placeholder="Motivo (opcional)"
              maxLength={240}
            />
            <button type="button" onClick={() => void addMovement()} disabled={busy || mvAmount <= 0} className="btn-secondary !py-2 text-sm">
              Registrar movimentação
            </button>
          </div>

          <div className="surface space-y-3 p-5">
            <p className="font-medium">Fechar caixa</p>
            <p className="text-xs text-ink-soft">Informe o conferido por forma. O sistema calcula a diferença contra o esperado.</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(COUNT_LABEL) as CountMethod[]).map((m) => (
                <label key={m} className="block text-sm">
                  <span className="mb-1 block text-ink-soft">{COUNT_LABEL[m]}</span>
                  <MoneyField
                    className="field text-sm"
                    cents={counted[m]}
                    onCentsChange={(c) => setCounted((cur) => ({ ...cur, [m]: c ?? 0 }))}
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void closeCash()} disabled={busy} className="btn-primary !py-2 text-sm">
              {busy ? "Fechando…" : "Fechar caixa"}
            </button>
          </div>
        </>
      )}

      {closed ? (
        <div className="surface space-y-2 p-5">
          <p className="font-medium">Resumo do fechamento</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Diferença (conferido − esperado)</span>
            <span className={`tabular-nums font-medium ${(closed.differenceCents ?? 0) < 0 ? "text-chili" : "text-sage"}`}>
              {formatBrlFromCents(closed.differenceCents ?? 0)}
            </span>
          </div>
          {closed.expectedByMethod
            ? (Object.keys(COUNT_LABEL) as CountMethod[]).map((m) => (
                <div key={m} className="flex items-center justify-between text-xs text-ink-soft">
                  <span>{COUNT_LABEL[m]}</span>
                  <span className="tabular-nums">
                    esperado {formatBrlFromCents(closed.expectedByMethod?.[m] ?? 0)} · conferido{" "}
                    {formatBrlFromCents(closed.countedByMethod?.[m] ?? 0)}
                  </span>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
