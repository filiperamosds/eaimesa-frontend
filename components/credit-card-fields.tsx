"use client";

import { creditCardSchema, type CheckoutCreditCard } from "@eaimesa/shared";

export type CreditCardDraft = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

export const EMPTY_CARD_DRAFT: CreditCardDraft = {
  holder: "",
  number: "",
  expiry: "",
  cvv: "",
};

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function formatCardNumber(raw: string) {
  const digits = onlyDigits(raw, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatCardExpiry(raw: string) {
  const digits = onlyDigits(raw, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function expiryParts(raw: string): { expiryMonth: string; expiryYear: string } | null {
  const digits = onlyDigits(raw, 4);
  if (digits.length !== 4) return null;
  return { expiryMonth: digits.slice(0, 2), expiryYear: `20${digits.slice(2)}` };
}

export function parseCreditCardDraft(
  draft: CreditCardDraft,
): { ok: true; card: CheckoutCreditCard } | { ok: false; message: string } {
  const parts = expiryParts(draft.expiry);
  if (!parts) return { ok: false, message: "Validade no formato MM/AA." };
  const parsed = creditCardSchema.safeParse({
    holderName: draft.holder,
    number: draft.number,
    expiryMonth: parts.expiryMonth,
    expiryYear: parts.expiryYear,
    ccv: draft.cvv,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revise os dados do cartão." };
  }
  return { ok: true, card: parsed.data };
}

type Props = {
  draft: CreditCardDraft;
  pending: boolean;
  onChange: (next: CreditCardDraft) => void;
};

export function CreditCardFields({ draft, pending, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Número do cartão</span>
        <input
          className="field font-mono tracking-wide"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="ACCT-000003"
          value={draft.number}
          disabled={pending}
          onChange={(e) => onChange({ ...draft, number: formatCardNumber(e.target.value) })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Nome no cartão</span>
        <input
          className="field"
          autoComplete="cc-name"
          placeholder="Como está impresso"
          value={draft.holder}
          disabled={pending}
          onChange={(e) => onChange({ ...draft, holder: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Validade</span>
          <input
            className="field"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={draft.expiry}
            disabled={pending}
            onChange={(e) => onChange({ ...draft, expiry: formatCardExpiry(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">CVV</span>
          <input
            className="field"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            value={draft.cvv}
            disabled={pending}
            onChange={(e) => onChange({ ...draft, cvv: onlyDigits(e.target.value, 4) })}
          />
        </label>
      </div>
    </div>
  );
}
