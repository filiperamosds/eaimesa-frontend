"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { MoneyField } from "./masked-fields";

type Preview = {
  subtotalCents: number;
  serviceFeePercent: number;
  serviceFeeCents: number;
  discountCents: number;
  totalDueCents: number;
};

type Method = "cash" | "debit" | "credit" | "pix" | "courtesy" | "other";
type PaymentLine = { method: Method; amountCents: number; tenderedCents: number | null };

const METHOD_LABEL: Record<Method, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  courtesy: "Cortesia",
  other: "Outro",
};

type Props = {
  tabId: string;
  guestName: string;
  onCancel: () => void;
  onDone: () => void;
};

export function StaffCloseTabDialog({ tabId, guestName, onCancel, onDone }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [draft, setDraft] = useState<PaymentLine>({ method: "cash", amountCents: 0, tenderedCents: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Preview>(`/v1/staff/tabs/${tabId}/settlement`)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar o fechamento."));
  }, [tabId]);

  const subtotal = preview?.subtotalCents ?? 0;
  const fee = preview?.serviceFeeCents ?? 0;
  const totalDue = Math.max(0, subtotal + fee - discountCents);
  const paid = payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = Math.max(0, totalDue - paid);
  const change = payments.reduce(
    (s, p) => s + (p.method === "cash" && p.tenderedCents && p.tenderedCents > p.amountCents ? p.tenderedCents - p.amountCents : 0),
    0,
  );

  function addPayment() {
    if (draft.amountCents <= 0) return;
    setPayments((cur) => [...cur, draft]);
    setDraft({ method: "cash", amountCents: 0, tenderedCents: null });
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/staff/tabs/${tabId}/close`, {
        method: "POST",
        body: JSON.stringify({
          discountCents,
          payments: payments.map((p) => ({
            method: p.method,
            amountCents: p.amountCents,
            tenderedCents: p.method === "cash" ? p.tenderedCents ?? undefined : undefined,
          })),
        }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fechar a comanda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="surface flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto p-5">
        <p className="eyebrow">Fechar comanda</p>
        <h2 className="mt-2 font-serif text-2xl">{guestName}</h2>

        {!preview && !error ? <p className="mt-4 text-ink-soft">Carregando…</p> : null}

        {preview ? (
          <>
            <div className="mt-4 space-y-1 text-sm">
              <Row label="Subtotal" value={formatBrlFromCents(subtotal)} />
              {fee > 0 ? <Row label={`Taxa de serviço (${preview.serviceFeePercent}%)`} value={formatBrlFromCents(fee)} /> : null}
              <label className="flex items-center justify-between gap-2">
                <span className="text-ink-soft">Desconto</span>
                <MoneyField
                  className="field !w-32 text-right"
                  cents={discountCents}
                  onCentsChange={(c) => setDiscountCents(c ?? 0)}
                />
              </label>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-medium">
                <span>Total a receber</span>
                <span className="tabular-nums text-chili">{formatBrlFromCents(totalDue)}</span>
              </div>
            </div>

            {payments.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm">
                {payments.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
                    <span>
                      {METHOD_LABEL[p.method]}
                      {p.method === "cash" && p.tenderedCents ? (
                        <span className="ml-2 text-xs text-ink-soft">recebido {formatBrlFromCents(p.tenderedCents)}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{formatBrlFromCents(p.amountCents)}</span>
                      <button
                        type="button"
                        onClick={() => setPayments((cur) => cur.filter((_, j) => j !== i))}
                        className="text-xs text-chili"
                        aria-label="Remover pagamento"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">{remaining > 0 ? "Falta" : change > 0 ? "Troco" : "Quitado"}</span>
              <span className="tabular-nums font-medium">
                {remaining > 0 ? formatBrlFromCents(remaining) : change > 0 ? formatBrlFromCents(change) : formatBrlFromCents(0)}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-line p-3">
              <p className="text-sm font-medium">Adicionar forma</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className="field text-sm"
                  value={draft.method}
                  onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as Method, tenderedCents: null }))}
                >
                  {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
                    <option key={m} value={m}>
                      {METHOD_LABEL[m]}
                    </option>
                  ))}
                </select>
                <MoneyField
                  className="field text-sm"
                  cents={draft.amountCents}
                  onCentsChange={(c) => setDraft((d) => ({ ...d, amountCents: c ?? 0 }))}
                  placeholder="Valor"
                />
              </div>
              {draft.method === "cash" ? (
                <label className="mt-2 block text-sm">
                  <span className="mb-1 block text-ink-soft">Recebido em dinheiro (para troco)</span>
                  <MoneyField
                    className="field text-sm"
                    cents={draft.tenderedCents}
                    onCentsChange={(c) => setDraft((d) => ({ ...d, tenderedCents: c }))}
                    placeholder="opcional"
                  />
                </label>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, amountCents: remaining }))}
                  className="btn-ghost flex-1 text-sm"
                  disabled={remaining <= 0}
                >
                  Usar o que falta
                </button>
                <button type="button" onClick={addPayment} className="btn-secondary flex-1 text-sm" disabled={draft.amountCents <= 0}>
                  Adicionar
                </button>
              </div>
            </div>

            {remaining > 0 && payments.length > 0 ? (
              <p className="mt-3 text-xs text-ink-soft">
                Fechamento parcial: falta {formatBrlFromCents(remaining)}. A comanda fecha e o saldo fica como pendente.
              </p>
            ) : null}
          </>
        ) : null}

        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1 text-sm">
            Cancelar
          </button>
          <button type="button" onClick={() => void confirm()} disabled={busy || !preview} className="btn-primary flex-1 !py-2 text-sm">
            {busy ? "Fechando…" : "Fechar comanda"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
