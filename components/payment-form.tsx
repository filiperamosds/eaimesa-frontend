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
  coverageNote?: string;
  onCancel: () => void;
  onPay: (method: PaymentMethod, payer?: CheckoutPayer) => void;
};

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
  provider,
  coverageNote,
  onCancel,
  onPay,
}: Props) {
  const available = methods.length ? methods : (["card", "pix"] as PaymentMethod[]);
  const [method, setMethod] = useState<PaymentMethod>(available[0] ?? "card");
  const [payerName, setPayerName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const amount = formatBrlFromCents(amountCents);
  const hosted = checkoutMode === "hosted";
  const providerLabel = provider === "asaas" ? "Asaas" : provider || "provedor";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
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
            ? `Você informa cartão ou PIX na página segura do ${providerLabel}. O EaiMesa só envia plano, meio e dados do pagador — nunca número, validade nem CVV.`
            : "Este ambiente aprova na hora. O POST leva só o plano e o meio (cartão ou PIX). Número, validade e CVV não existem neste fluxo e não vão para a API."}
        </p>
        {coverageNote ? <p className="mt-2 text-sm text-ink-soft">{coverageNote}</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Meio de pagamento</legend>
        <p className="text-sm text-ink-soft">
          {hosted
            ? "Cartão ou PIX. Os dados do cartão ficam só na página segura do provedor."
            : "Cartão ou PIX. A API não recebe dados do cartão — só esta escolha."}
        </p>
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
                {hosted
                  ? id === "pix"
                    ? "QR na próxima página"
                    : "Informe o cartão na próxima página"
                  : "Simulado neste ambiente"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {hosted && requiresPayer ? (
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
      ) : null}

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
