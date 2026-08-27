"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { MoneyField } from "./masked-fields";

const STORAGE_KEY = "eaimesa_cash_session";

type MovementType = "sangria" | "suprimento" | "ajuste";
const MOVEMENT_LABEL: Record<MovementType, string> = {
  suprimento: "Suprimento (reforço)",
  sangria: "Sangria (retirada)",
  ajuste: "Ajuste",
};

type CountMethod = "cash" | "debit" | "credit" | "pix" | "courtesy" | "other";
const COUNT_LABEL: Record<CountMethod, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  courtesy: "Cortesia",
  other: "Outro",
};
const ALWAYS_COUNT: CountMethod[] = ["cash", "debit", "credit", "pix"];

type CashSession = {
  id: string;
  status: string;
  openingFloatCents: number;
  differenceCents?: number | null;
  expectedByMethod?: Record<string, number> | null;
  countedByMethod?: Record<string, number> | null;
};

const EMPTY_COUNT: Record<CountMethod, number> = {
  cash: 0,
  debit: 0,
  credit: 0,
  pix: 0,
  courtesy: 0,
  other: 0,
};

function loadStoredId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function fromExpected(raw?: Record<string, number> | null): Record<CountMethod, number> {
  return {
    cash: raw?.cash ?? 0,
    debit: raw?.debit ?? 0,
    credit: raw?.credit ?? 0,
    pix: raw?.pix ?? 0,
    courtesy: raw?.courtesy ?? 0,
    other: raw?.other ?? 0,
  };
}

function visibleMethods(expected: Record<CountMethod, number>): CountMethod[] {
  const extra = (Object.keys(COUNT_LABEL) as CountMethod[]).filter(
    (m) => !ALWAYS_COUNT.includes(m) && (expected[m] ?? 0) !== 0,
  );
  return [...ALWAYS_COUNT, ...extra];
}

export function CashRegisterPanel() {
  const [sessionId, setSessionId] = useState<string | null>(loadStoredId);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [mvType, setMvType] = useState<MovementType>("suprimento");
  const [mvAmount, setMvAmount] = useState(0);
  const [mvReason, setMvReason] = useState("");
  const [expected, setExpected] = useState<Record<CountMethod, number>>(EMPTY_COUNT);
  const [counted, setCounted] = useState<Record<CountMethod, number>>(EMPTY_COUNT);
  const [closed, setClosed] = useState<CashSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function store(id: string | null) {
    setSessionId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  function applyExpected(raw?: Record<string, number> | null, fillCounted = true) {
    const next = fromExpected(raw);
    setExpected(next);
    if (fillCounted) setCounted(next);
  }

  const loadCurrent = useCallback(async (fillCounted = true) => {
    try {
      const s = await api<CashSession>("/v1/staff/cash-sessions/current");
      store(s.id);
      applyExpected(s.expectedByMethod, fillCounted);
      setClosed(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        store(null);
        applyExpected(null, true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o caixa.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadCurrent(true).finally(() => setLoading(false));
  }, [loadCurrent]);

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
      applyExpected(s.expectedByMethod, true);
      setClosed(null);
      setMsg("Caixa aberto.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CASH_SESSION_OPEN") {
        await loadCurrent(true);
        setMsg("Já havia um caixa aberto. Valores do turno carregados.");
        return;
      }
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
      await loadCurrent(true);
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
      applyExpected(null, true);
      setMsg("Caixa fechado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fechar o caixa.");
    } finally {
      setBusy(false);
    }
  }

  const methods = visibleMethods(expected);
  const liveDiff = methods.reduce((sum, m) => sum + (counted[m] ?? 0) - (expected[m] ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Caixa</p>
        <h1 className="mt-1 font-serif text-2xl">Fechamento de caixa</h1>
      </div>

      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}

      {loading ? (
        <p className="text-sm text-ink-soft">Carregando o caixa…</p>
      ) : !sessionId ? (
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
            <p className="text-xs text-ink-soft">
              Já vem preenchido com o que o caixa vendeu no turno (mais fundo de troco e movimentações). Corrija se a
              conferência for diferente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((m) => (
                <label key={m} className="block text-sm">
                  <span className="mb-1 flex items-baseline justify-between gap-2 text-ink-soft">
                    <span>{COUNT_LABEL[m]}</span>
                    <span className="tabular-nums text-[11px]">esperado {formatBrlFromCents(expected[m] ?? 0)}</span>
                  </span>
                  <MoneyField
                    className="field text-sm"
                    cents={counted[m]}
                    onCentsChange={(c) => setCounted((cur) => ({ ...cur, [m]: c ?? 0 }))}
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Diferença agora</span>
              <span className={`tabular-nums font-medium ${liveDiff < 0 ? "text-chili" : "text-sage"}`}>
                {formatBrlFromCents(liveDiff)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadCurrent(true)}
                disabled={busy}
                className="btn-secondary !py-2 text-sm"
              >
                Atualizar vendas do turno
              </button>
              <button type="button" onClick={() => void closeCash()} disabled={busy} className="btn-primary !py-2 text-sm">
                {busy ? "Fechando…" : "Fechar caixa"}
              </button>
            </div>
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
            ? visibleMethods(fromExpected(closed.expectedByMethod)).map((m) => (
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
