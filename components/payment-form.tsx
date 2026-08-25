"use client";

import {
  creditCardSchema,
  formatBrlFromCents,
  formatCepInput,
  formatCpfCnpjInput,
  formatPhoneInput,
  hasPromoPrice,
  isRepresentativeComplete,
  payerSchema,
  representativeFingerprint,
  type CheckoutCreditCard,
  type CheckoutMode,
  type CheckoutPayer,
  type PaymentMethod,
} from "@eaimesa/shared";
import { useState } from "react";
import { PlanPrice } from "./plan-price";

type Props = {
  planName: string;
  amountCents: number;
  listPriceCents?: number;
  promoPriceCents?: number | null;
  pending: boolean;
  checkoutMode: CheckoutMode;
  requiresPayer: boolean;
  methods: PaymentMethod[];
  defaultEmail?: string;
  /** Pré-fill do responsável (ADR-025). Se inalterado no submit, omite `payer`. */
  initialPayer?: CheckoutPayer | null;
  provider?: string;
  coverageNote?: string;
  onCancel: () => void;
  onPay: (method: PaymentMethod, payer?: CheckoutPayer, creditCard?: CheckoutCreditCard) => void;
};

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatCard(raw: string) {
  const digits = onlyDigits(raw, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = onlyDigits(raw, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function expiryParts(raw: string): { expiryMonth: string; expiryYear: string } | null {
  const digits = onlyDigits(raw, 4);
  if (digits.length !== 4) return null;
  const month = digits.slice(0, 2);
  const year = `20${digits.slice(2)}`;
  return { expiryMonth: month, expiryYear: year };
}

export function PaymentForm({
  planName,
  amountCents,
  listPriceCents,
  promoPriceCents,
  pending,
  checkoutMode,
  requiresPayer,
  methods,
  defaultEmail = "",
  initialPayer = null,
  provider,
  coverageNote,
  onCancel,
  onPay,
}: Props) {
  const available = methods.length ? methods : (["card", "pix"] as PaymentMethod[]);
  const [method, setMethod] = useState<PaymentMethod>(available[0] ?? "card");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [payerName, setPayerName] = useState(initialPayer?.name ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(
    initialPayer?.cpfCnpj ? formatCpfCnpjInput(initialPayer.cpfCnpj) : "",
  );
  const [email, setEmail] = useState(initialPayer?.email || defaultEmail);
  const [phone, setPhone] = useState(
    initialPayer?.phone ? formatPhoneInput(initialPayer.phone) : "",
  );
  const [postalCode, setPostalCode] = useState(
    initialPayer?.postalCode ? formatCepInput(initialPayer.postalCode) : "",
  );
  const [addressNumber, setAddressNumber] = useState(initialPayer?.addressNumber ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const amount = formatBrlFromCents(amountCents);
  const hosted = checkoutMode === "hosted";
  const asaas = provider === "asaas" || hosted;
  const captureCard = method === "card";
  const needPayer = asaas && (requiresPayer || captureCard);
  const providerLabel = provider === "asaas" ? "Asaas" : provider || "provedor";
  const baselineFp = representativeFingerprint(initialPayer);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    let payer: CheckoutPayer | undefined;
    if (needPayer) {
      const current = {
        name: payerName,
        cpfCnpj,
        email,
        phone,
        postalCode: captureCard ? postalCode : initialPayer?.postalCode,
        addressNumber: captureCard ? addressNumber : initialPayer?.addressNumber,
      };
      const unchanged =
        isRepresentativeComplete(initialPayer) &&
        representativeFingerprint({
          name: payerName,
          cpfCnpj,
          email,
          phone,
          postalCode,
          addressNumber,
        }) === baselineFp;

      if (unchanged) {
        payer = undefined;
      } else {
        const parsed = payerSchema.safeParse({
          name: current.name,
          cpfCnpj: current.cpfCnpj,
          email: current.email,
          phone: current.phone,
          postalCode: captureCard ? current.postalCode : undefined,
          addressNumber: captureCard ? current.addressNumber : undefined,
        });
        if (!parsed.success) {
          setLocalError(parsed.error.issues[0]?.message ?? "Revise os dados do pagador.");
          return;
        }
        if (captureCard && !parsed.data.phone) {
          setLocalError("Informe o telefone do titular.");
          return;
        }
        if (captureCard && !parsed.data.postalCode) {
          setLocalError("Informe o CEP do titular.");
          return;
        }
        if (captureCard && !parsed.data.addressNumber) {
          setLocalError("Informe o número do endereço.");
          return;
        }
        payer = parsed.data;
      }
    }

    let card: CheckoutCreditCard | undefined;
    if (captureCard) {
      const parts = expiryParts(expiry);
      if (!parts) {
        setLocalError("Validade no formato MM/AA.");
        return;
      }
      const parsed = creditCardSchema.safeParse({
        holderName: holder,
        number,
        expiryMonth: parts.expiryMonth,
        expiryYear: parts.expiryYear,
        ccv: cvv,
      });
      if (!parsed.success) {
        setLocalError(parsed.error.issues[0]?.message ?? "Revise os dados do cartão.");
        return;
      }
      card = parsed.data;
    }

    onPay(method, payer, card);
  }

  return (
    <form onSubmit={submit} className="surface space-y-5 p-5" aria-busy={pending}>
      <div>
        <p className="eyebrow">Pagar agora</p>
        <h3 className="mt-2 font-serif text-2xl">{planName}</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Cobrança de{" "}
          {hasPromoPrice({ priceCents: listPriceCents ?? amountCents, promoPriceCents }) ? (
            <PlanPrice
              priceCents={listPriceCents ?? amountCents}
              promoPriceCents={promoPriceCents}
              suffix=""
              className="font-medium text-ink"
            />
          ) : (
            <span className="font-medium text-ink">{amount}</span>
          )}{" "}
          (mensal).{" "}
          {captureCard
            ? asaas
              ? `Você digita o cartão aqui. O EaiMesa envia número, validade e CVV ao ${providerLabel} em HTTPS e não grava PAN — só o token para as próximas cobranças.`
              : "Ambiente de teste: o POST leva plano, meio e os dados do cartão. O stub não cobra de verdade."
            : asaas
              ? `PIX na página segura do ${providerLabel}.`
              : "PIX simulado neste ambiente."}
        </p>
        {coverageNote ? <p className="mt-2 text-sm text-ink-soft">{coverageNote}</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Meio de pagamento</legend>
        <div className="grid grid-cols-2 gap-2">
          {available.map((id) => (
            <button
              key={id}
              type="button"
              disabled={pending}
              onClick={() => setMethod(id)}
              aria-pressed={method === id}
              className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                method === id ? "border-chili bg-chili/5 font-medium" : "border-line"
              }`}
            >
              <span className="block">{id === "pix" ? "PIX" : "Cartão"}</span>
              <span className="mt-0.5 block text-xs font-normal text-ink-soft">
                {id === "pix"
                  ? asaas
                    ? "QR na próxima página"
                    : "Simulado neste ambiente"
                  : asaas
                    ? `Enviado ao ${providerLabel}`
                    : "Enviado no POST (teste)"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {needPayer ? (
        <div className="space-y-3">
          {isRepresentativeComplete(initialPayer) ? (
            <p className="rounded-2xl border border-line bg-paper-2/60 px-3 py-2 text-xs text-ink-soft">
              Pagador pré-preenchido com o responsável. Sem alterar os campos, o checkout usa o
              cadastro salvo (sem reenviar `payer`).
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome do pagador</span>
            <input
              className="field"
              autoComplete="name"
              placeholder="Como no documento"
              value={payerName}
              disabled={pending}
              onChange={(e) => setPayerName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">CPF ou CNPJ</span>
            <input
              className="field font-mono tracking-wide"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpfCnpj}
              disabled={pending}
              onChange={(e) => setCpfCnpj(formatCpfCnpjInput(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">E-mail de cobrança (opcional)</span>
            <input
              className="field"
              type="email"
              autoComplete="email"
              value={email}
              disabled={pending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              Telefone{captureCard ? "" : " (opcional)"}
            </span>
            <input
              className="field"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 98888-7777"
              value={phone}
              disabled={pending}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            />
          </label>
          {captureCard ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">CEP do titular</span>
                <input
                  className="field font-mono tracking-wide"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  value={postalCode}
                  disabled={pending}
                  onChange={(e) => setPostalCode(formatCepInput(e.target.value))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Número do endereço</span>
                <input
                  className="field"
                  autoComplete="address-line2"
                  placeholder="123"
                  value={addressNumber}
                  disabled={pending}
                  onChange={(e) => setAddressNumber(e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      {captureCard ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Número do cartão</span>
            <input
              className="field font-mono tracking-wide"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="ACCT-000003"
              value={number}
              disabled={pending}
              onChange={(e) => setNumber(formatCard(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome no cartão</span>
            <input
              className="field"
              autoComplete="cc-name"
              placeholder="Como está impresso"
              value={holder}
              disabled={pending}
              onChange={(e) => setHolder(e.target.value)}
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
                value={expiry}
                disabled={pending}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">CVV</span>
              <input
                className="field"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvv}
                disabled={pending}
                onChange={(e) => setCvv(onlyDigits(e.target.value, 4))}
              />
            </label>
          </div>
        </div>
      ) : asaas ? (
        <p className="text-sm text-ink-soft">Você confirma o PIX na página do {providerLabel}.</p>
      ) : null}

      {localError ? <p className="text-sm text-chili">{localError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? captureCard
              ? "Enviando pagamento…"
              : "Abrindo o pagamento…"
            : captureCard
              ? `Pagar ${amount}`
              : `Continuar para pagar ${amount}`}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
