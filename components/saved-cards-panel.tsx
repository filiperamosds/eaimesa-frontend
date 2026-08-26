"use client";

import {
  ERROR_CODES,
  SAVED_CARDS_MAX,
  formatSavedCardLabel,
  isRepresentativeComplete,
  isSavedCardId,
  type SavedCard,
} from "@eaimesa/shared";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  CreditCardFields,
  EMPTY_CARD_DRAFT,
  parseCreditCardDraft,
  type CreditCardDraft,
} from "./credit-card-fields";

type CardsResponse = {
  savedCards?: SavedCard[];
  savedCard?: { id?: string; last4: string; brand?: string | null } | null;
  card?: SavedCard;
};

type Props = {
  cards: SavedCard[];
  asaas: boolean;
  representativeOk: boolean;
  disabled?: boolean;
  onReload: () => Promise<void>;
};

function cardError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === ERROR_CODES.PAYER_REQUIRED) {
      return "Cadastre o responsável completo antes de salvar o cartão.";
    }
    if (err.code === ERROR_CODES.CREDIT_CARD_REQUIRED || err.code === ERROR_CODES.CARD_REQUIRED) {
      return "Informe os dados do cartão.";
    }
    return err.message;
  }
  return "Não foi possível atualizar os cartões.";
}

export function SavedCardsPanel({ cards, asaas, representativeOk, disabled, onReload }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CreditCardDraft>(EMPTY_CARD_DRAFT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const busy = pending || Boolean(disabled);
  const atLimit = cards.length >= SAVED_CARDS_MAX;
  const canManage = asaas;

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const parsed = parseCreditCardDraft(draft);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setPending(true);
    try {
      await api<CardsResponse>("/v1/billing/cards", {
        method: "POST",
        body: JSON.stringify({ creditCard: parsed.card }),
      });
      setDraft(EMPTY_CARD_DRAFT);
      setAdding(false);
      setOk("Cartão salvo.");
      await onReload();
    } catch (err) {
      setError(cardError(err));
    } finally {
      setPending(false);
    }
  }

  async function makeDefault(id: string) {
    setError(null);
    setOk(null);
    setPending(true);
    try {
      await api<CardsResponse>(`/v1/billing/cards/${id}/default`, { method: "POST" });
      setOk("Assinatura atualizada.");
      await onReload();
    } catch (err) {
      setError(cardError(err));
    } finally {
      setPending(false);
    }
  }

  async function removeCard(id: string) {
    if (!confirm("Remover este cartão salvo?")) return;
    setError(null);
    setOk(null);
    setPending(true);
    try {
      await api<{ ok?: boolean; savedCards?: SavedCard[] }>(`/v1/billing/cards/${id}`, {
        method: "DELETE",
      });
      setOk("Cartão removido.");
      await onReload();
    } catch (err) {
      setError(cardError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="cartoes" className="surface space-y-4 p-5">
      <div>
        <p className="eyebrow">Cartões salvos</p>
        <h3 className="mt-2 font-serif text-xl">Cobrança mensal</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Até {SAVED_CARDS_MAX} cartões. O padrão é o que a assinatura usa no próximo ciclo.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum cartão salvo ainda.</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => {
            const manageable = isSavedCardId(card.id);
            return (
              <li
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper-2/40 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{formatSavedCardLabel(card)}</p>
                  {card.isDefault ? (
                    <p className="text-xs text-sage">Padrão da assinatura</p>
                  ) : null}
                </div>
                {canManage && manageable ? (
                  <div className="flex flex-wrap gap-1">
                    {!card.isDefault ? (
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        disabled={busy}
                        onClick={() => void makeDefault(card.id)}
                      >
                        Tornar padrão
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      disabled={busy}
                      onClick={() => void removeCard(card.id)}
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!canManage ? (
        <p className="text-xs text-ink-soft">
          Trocar cartão só está disponível com o gateway Asaas. No stub local o cartão não é gravado.
        </p>
      ) : null}

      {canManage && !representativeOk ? (
        <p className="text-sm text-ink-soft">
          Para adicionar um cartão, cadastre o{" "}
          <Link href="/painel/configuracoes/responsavel" className="font-medium text-chili underline">
            responsável
          </Link>{" "}
          completo (nome, CPF/CNPJ, e-mail, telefone, CEP e número).
        </p>
      ) : null}

      {canManage && representativeOk && !adding && !atLimit ? (
        <button
          type="button"
          className="btn-secondary !py-2 text-sm"
          disabled={busy}
          onClick={() => {
            setAdding(true);
            setError(null);
            setOk(null);
          }}
        >
          Adicionar cartão
        </button>
      ) : null}

      {canManage && atLimit && !adding ? (
        <p className="text-xs text-ink-soft">Limite de {SAVED_CARDS_MAX} cartões. Remova um para adicionar outro.</p>
      ) : null}

      {adding ? (
        <form onSubmit={(e) => void addCard(e)} className="space-y-4 rounded-2xl border border-line p-4">
          <CreditCardFields draft={draft} pending={busy} onChange={setDraft} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary !py-2 text-sm">
              {pending ? "Salvando…" : "Salvar cartão"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setDraft(EMPTY_CARD_DRAFT);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage">{ok}</p> : null}
    </section>
  );
}
