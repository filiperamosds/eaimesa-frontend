"use client";

import {
  formatBrlFromCents,
  formatCepInput,
  formatCpfCnpjInput,
  formatPhoneInput,
  formatSavedCardLabel,
  hasPromoPrice,
  isRepresentativeComplete,
  payerSchema,
  representativeFingerprint,
  upgradeQuoteLine,
  type CheckoutCreditCard,
  type CheckoutMode,
  type CheckoutPayer,
  type PaymentMethod,
  type SavedCard,
  type UpgradeQuote,
} from "@eaimesa/shared";
import { useState } from "react";
import {
  CreditCardFields,
  EMPTY_CARD_DRAFT,
  parseCreditCardDraft,
  type CreditCardDraft,
} from "./credit-card-fields";
import { PlanPrice } from "./plan-price";

type Props = {
  planName: string;
  amountCents: number;
  listPriceCents?: number;
  promoPriceCents?: number | null;
  upgradeQuote?: UpgradeQuote | null;
  pending: boolean;
  checkoutMode: CheckoutMode;
  requiresPayer: boolean;
  methods: PaymentMethod[];
  defaultEmail?: string;
  /** Pré-fill do responsável (ADR-025). Se inalterado no submit, omite `payer`. */
  initialPayer?: CheckoutPayer | null;
  provider?: string;
  coverageNote?: string;
  savedCards?: SavedCard[];
  onCancel: () => void;
  onPay: (method: PaymentMethod, payer?: CheckoutPayer, creditCard?: CheckoutCreditCard) => void;
};

export function PaymentForm({
  planName,
  amountCents,
  listPriceCents,
  promoPriceCents,
  upgradeQuote = null,
  pending,
  checkoutMode,
  requiresPayer,
  methods,
  defaultEmail = "",
  initialPayer = null,
  provider,
  coverageNote,
  savedCards = [],
  onCancel,
  onPay,
}: Props) {
  const available = methods.length ? methods : (["card", "pix"] as PaymentMethod[]);
  const [method, setMethod] = useState<PaymentMethod>(available[0] ?? "card");
  const defaultSaved =
    savedCards.find((c) => c.isDefault) ?? savedCards[0] ?? null;
  const [useSaved, setUseSaved] = useState(Boolean(defaultSaved));
  const [draft, setDraft] = useState<CreditCardDraft>(EMPTY_CARD_DRAFT);
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
  const liveGateway =
    provider === "asaas" || hosted || checkoutMode === "inline";
  const captureCard = method === "card" && (!useSaved || !defaultSaved);
  const needPayer = liveGateway && (requiresPayer || method === "card");
  const providerLabel = provider === "asaas" ? "Asaas" : provider || "provedor";
  const baselineFp = representativeFingerprint(initialPayer);
  const quoteLine =
    upgradeQuote && upgradeQuote.isUpgrade ? upgradeQuoteLine(upgradeQuote) : null;

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
        postalCode: method === "card" ? postalCode : initialPayer?.postalCode,
        addressNumber: method === "card" ? addressNumber : initialPayer?.addressNumber,
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
          postalCode: method === "card" ? current.postalCode : undefined,
          addressNumber: method === "card" ? current.addressNumber : undefined,
        });
        if (!parsed.success) {
          setLocalError(parsed.error.issues[0]?.message ?? "Revise os dados do pagador.");
          return;
        }
        if (method === "card" && !parsed.data.phone) {
          setLocalError("Informe o telefone do titular.");
          return;
        }
        if (method === "card" && !parsed.data.postalCode) {
          setLocalError("Informe o CEP do titular.");
          return;
        }
        if (method === "card" && !parsed.data.addressNumber) {
          setLocalError("Informe o número do endereço.");
          return;
        }
        payer = parsed.data;
      }
    }

    let card: CheckoutCreditCard | undefined;
    if (method === "card" && captureCard) {
      const parsed = parseCreditCardDraft(draft);
      if (!parsed.ok) {
        setLocalError(parsed.message);
        return;
      }
      card = parsed.card;
    }

    onPay(method, payer, card);
  }

  const ctaAmount =
    quoteLine && upgradeQuote
      ? amountCents === 0
        ? "Confirmar upgrade"
        : `Pagar ${amount} hoje`
      : method === "card"
        ? `Pagar ${amount}`
        : `Continuar para pagar ${amount}`;

  return (
    <form onSubmit={submit} className="surface space-y-5 p-5" aria-busy={pending}>
      <div>
        <p className="eyebrow">Pagar agora</p>
        <h3 className="mt-2 font-serif text-2xl">{planName}</h3>
        {quoteLine ? (
          <p className="mt-1 text-sm text-ink-soft">
            Upgrade com prorrata: <span className="font-medium text-ink">{quoteLine}</span>.
          </p>
        ) : (
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
            (mensal).
          </p>
        )}
        <p className="mt-1 text-sm text-ink-soft">
          {method === "card"
            ? liveGateway
              ? captureCard
                ? `Você informa o cartão aqui. Os dados vão ao ${providerLabel} e não ficam guardados no EaiMesa.`
                : `Cobra no cartão ${formatSavedCardLabel(defaultSaved!)}. A renovação mensal usa o cartão padrão.`
              : "Pagamento simulado — sem cobrança real."
            : liveGateway
              ? `PIX na página segura do ${providerLabel}. A renovação exige um novo pagamento PIX (QR ou link) a cada mês — não debita sozinho.`
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
                  ? liveGateway
                    ? "QR na próxima página · renovação manual"
                    : "Simulado neste ambiente"
                  : liveGateway
                    ? `Enviado ao ${providerLabel}`
                    : "Simulado neste ambiente"}
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
              cadastro salvo.
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
              Telefone{method === "card" ? "" : " (opcional)"}
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
          {method === "card" ? (
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

      {method === "card" && defaultSaved ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Cartão</legend>
          <div className="grid gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setUseSaved(true)}
              aria-pressed={useSaved}
              className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                useSaved ? "border-chili bg-chili/5 font-medium" : "border-line"
              }`}
            >
              Usar {formatSavedCardLabel(defaultSaved)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setUseSaved(false)}
              aria-pressed={!useSaved}
              className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                !useSaved ? "border-chili bg-chili/5 font-medium" : "border-line"
              }`}
            >
              Usar outro cartão
            </button>
          </div>
        </fieldset>
      ) : null}

      {method === "card" && captureCard ? (
        <CreditCardFields draft={draft} pending={pending} onChange={setDraft} />
      ) : method === "pix" && liveGateway ? (
        <p className="text-sm text-ink-soft">
          Você confirma o PIX na página do {providerLabel}. No mês seguinte será preciso pagar de
          novo (novo QR). Cartão é a opção para renovar sozinho.
        </p>
      ) : null}

      {localError ? <p className="text-sm text-chili">{localError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? method === "card"
              ? "Enviando pagamento…"
              : "Abrindo o pagamento…"
            : ctaAmount}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
