"use client";

import {
  formatBrlFromCents,
  formatCpfCnpjInput,
  formatPhoneInput,
  hasPromoPrice,
  payerSchema,
  type CheckoutMode,
  type CheckoutPayer,
  type PaymentMethod,
} from "@eaimesa/shared";
import { useState } from "react";
import { PlanPrice } from "./plan-price";

type Props = {
  planId: string;
  planName: string;
  amountCents: number;
  listPriceCents?: number;
  promoPriceCents?: number | null;
  pending: boolean;
  checkoutMode: CheckoutMode;
  requiresPayer: boolean;
  methods: PaymentMethod[];
  defaultEmail?: string;
  provider?: string;
  onCancel: () => void;
  onPay: (method: PaymentMethod, payer?: CheckoutPayer) => void;
};

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function PaymentForm({
  planId,
  planName,
  amountCents,
  listPriceCents,
  promoPriceCents,
  pending,
  checkoutMode,
  requiresPayer,
  methods,
  defaultEmail = "",
  provider,
  onCancel,
  onPay,
}: Props) {
  const available = methods.length ? methods : (["card", "pix"] as PaymentMethod[]);
  const [method, setMethod] = useState<PaymentMethod>(available[0] ?? "card");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [payerName, setPayerName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const amount = formatBrlFromCents(amountCents);
  const pixCode = `eaimesa-stub-${planId}-${amountCents}`;
  const hosted = checkoutMode === "hosted";
  const providerLabel = provider === "asaas" ? "Asaas" : provider || "provedor";

  function formatCard(raw: string) {
    const digits = onlyDigits(raw, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }

  function formatExpiry(raw: string) {
    const digits = onlyDigits(raw, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!hosted && method === "card") {
      const digits = onlyDigits(number, 16);
      if (digits.length < 13) {
        setLocalError("Informe o número do cartão.");
        return;
      }
      if (holder.trim().length < 3) {
        setLocalError("Informe o nome impresso no cartão.");
        return;
      }
      if (onlyDigits(expiry, 4).length !== 4) {
        setLocalError("Validade no formato MM/AA.");
        return;
      }
      if (onlyDigits(cvv, 4).length < 3) {
        setLocalError("Informe o CVV.");
        return;
      }
    }
    if (hosted && requiresPayer) {
      const parsed = payerSchema.safeParse({
        name: payerName,
        cpfCnpj,
        email,
        phone,
      });
      if (!parsed.success) {
        setLocalError(parsed.error.issues[0]?.message ?? "Revise os dados do pagador.");
        return;
      }
      onPay(method, parsed.data);
      return;
    }
    onPay(method);
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
          {hosted
            ? `Você conclui o pagamento na página segura do ${providerLabel}. O EaiMesa não recebe número de cartão, validade nem CVV.`
            : "Sem gateway nesta fatia — o formulário não envia dados do cartão."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {available.map((id) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => setMethod(id)}
            className={`rounded-2xl border px-3 py-2.5 text-sm ${
              method === id ? "border-chili bg-chili/5 font-medium" : "border-line"
            }`}
          >
            {id === "pix" ? "PIX" : "Cartão"}
          </button>
        ))}
      </div>

      {hosted ? (
        requiresPayer ? (
          <div className="space-y-3">
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
              <span className="mb-1 block font-medium">Telefone (opcional)</span>
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
          </div>
        ) : null
      ) : method === "card" ? (
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
      ) : (
        <div className="rounded-2xl border border-line bg-paper-2/60 p-4">
          <p className="text-sm font-medium">PIX (simulado)</p>
          <p className="mt-1 text-sm text-ink-soft">
            Código de teste — não é um PIX real. Confirme para o stub aprovar {amount}.
          </p>
          <p className="mt-3 break-all rounded-xl bg-card px-3 py-2 font-mono text-xs">{pixCode}</p>
        </div>
      )}

      {localError ? <p className="text-sm text-chili">{localError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? hosted
              ? "Abrindo o pagamento…"
              : "Confirmando pagamento…"
            : hosted
              ? `Continuar para pagar ${amount}`
              : `Pagar ${amount}`}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
