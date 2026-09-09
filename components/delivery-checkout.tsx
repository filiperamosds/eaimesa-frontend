"use client";

import {
  formatBrlFromCents,
  formatCepInput,
  formatCpfCnpjInput,
  isCep,
  newUuid,
  normalizeCep,
  normalizeCpfCnpj,
} from "@eaimesa/shared";
import { useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { DeliveryPublicOrder } from "../lib/types";
import { type CartLine } from "./guest-cart";
import { PhoneField } from "./masked-fields";

type Step = "items" | "phone" | "profile" | "address" | "pay";

export type DeliverySavedAddress = {
  id: string;
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string | null;
};

type LookupOk = {
  registered: true;
  name: string;
  addresses: DeliverySavedAddress[];
};

type ViaCep = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

function formatAddress(a: DeliverySavedAddress): string {
  const extra = a.complement ? ` — ${a.complement}` : "";
  const cep = a.postalCode.length === 8 ? `${a.postalCode.slice(0, 5)}-${a.postalCode.slice(5)}` : a.postalCode;
  return `${a.street}, ${a.number}${extra} · ${a.neighborhood} · ${a.city}/${a.state} · ${cep}`;
}

async function fetchViaCep(cep: string): Promise<ViaCep | null> {
  const d = normalizeCep(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (!res.ok || data.erro || !data.logradouro || !data.localidade || !data.uf) return null;
    return {
      street: data.logradouro,
      neighborhood: data.bairro ?? "",
      city: data.localidade,
      state: data.uf,
    };
  } catch {
    return null;
  }
}

export function DeliveryCheckout({
  slug,
  cart,
  onChange,
  feeCents,
  onClose,
  onPlaced,
}: {
  slug: string;
  cart: CartLine[];
  onChange: (next: CartLine[]) => void;
  feeCents: number;
  onClose: () => void;
  onPlaced: (trackPath: string) => void;
}) {
  const path = `/v1/public/venues/${encodeURIComponent(slug)}/delivery`;
  const [step, setStep] = useState<Step>("items");
  const [phone, setPhone] = useState("");
  const [wasRegistered, setWasRegistered] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [addresses, setAddresses] = useState<DeliverySavedAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [cep, setCep] = useState("");
  const [via, setVia] = useState<ViaCep | null>(null);
  const [cepMsg, setCepMsg] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [payOnDelivery, setPayOnDelivery] = useState<"cash" | "pix">("pix");
  const [orderNote, setOrderNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const cartCents = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      onChange(cart.filter((l) => l.catalogItemId !== id));
      return;
    }
    onChange(cart.map((l) => (l.catalogItemId === id ? { ...l, qty } : l)));
  }

  async function lookupPhone() {
    setPending(true);
    setError(null);
    try {
      const data = await api<{ registered: boolean } & Partial<LookupOk>>(`${path}/lookup`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      if (data.registered) {
        setWasRegistered(true);
        setName(data.name ?? "");
        setAddresses(data.addresses ?? []);
        setSelectedId(data.addresses?.[0]?.id ?? null);
        setAdding((data.addresses ?? []).length === 0);
        setStep("address");
      } else {
        setWasRegistered(false);
        setName("");
        setCpf("");
        setAddresses([]);
        setSelectedId(null);
        setStep("profile");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível consultar o telefone.");
    } finally {
      setPending(false);
    }
  }

  async function saveProfile() {
    setPending(true);
    setError(null);
    try {
      const data = await api<LookupOk>(`${path}/customers`, {
        method: "POST",
        body: JSON.stringify({ phone, name: name.trim(), cpf }),
      });
      setName(data.name);
      setAddresses(data.addresses ?? []);
      setSelectedId(data.addresses?.[0]?.id ?? null);
      setAdding((data.addresses ?? []).length === 0);
      setStep("address");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setPending(false);
    }
  }

  async function searchCep() {
    setCepMsg(null);
    setError(null);
    if (!isCep(cep)) {
      setCepMsg("CEP com 8 dígitos.");
      return;
    }
    setPending(true);
    const found = await fetchViaCep(cep);
    setPending(false);
    if (!found) {
      setVia(null);
      setCepMsg("CEP não encontrado. Confira os dígitos.");
      return;
    }
    setVia(found);
    setCepMsg(null);
  }

  async function saveAddress() {
    if (!via) {
      setError("Busque o CEP antes de salvar.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await api<{ address: DeliverySavedAddress; addresses: DeliverySavedAddress[] }>(
        `${path}/addresses`,
        {
          method: "POST",
          body: JSON.stringify({
            phone,
            postalCode: normalizeCep(cep),
            street: via.street,
            number: number.trim(),
            neighborhood: via.neighborhood.trim(),
            city: via.city,
            state: via.state,
            complement: complement.trim() || null,
          }),
        },
      );
      setAddresses(data.addresses);
      setSelectedId(data.address.id);
      setAdding(false);
      setCep("");
      setVia(null);
      setNumber("");
      setComplement("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (cart.length === 0 || !selectedId || sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    const key = newUuid();
    try {
      const created = await api<DeliveryPublicOrder>(`${path}/orders`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          phone,
          addressId: selectedId,
          payOnDelivery,
          note: orderNote.trim() || null,
          items: cart.map((l) => ({
            catalogItemId: l.catalogItemId,
            qty: l.qty,
            note: l.note.trim() || null,
          })),
        }),
      });
      if (!created.trackPath) throw new Error("missing_track");
      onChange([]);
      onPlaced(created.trackPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setPending(false);
      sending.current = false;
    }
  }

  const title =
    step === "items"
      ? "Itens"
      : step === "phone"
        ? "WhatsApp"
        : step === "profile"
          ? "Seus dados"
          : step === "address"
            ? "Endereço"
            : "Pagamento";
  const selectedAddress = addresses.find((a) => a.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-checkout-title"
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">Fechar pedido · {title}</p>
        <h2 id="delivery-checkout-title" className="font-serif text-2xl">
          Seu delivery
        </h2>
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto">
          {step === "items" ? (
            <>
              {cart.length === 0 ? (
                <p className="text-sm text-ink-soft">Cesta vazia. Adicione itens no cardápio.</p>
              ) : (
                <ul className="space-y-3">
                  {cart.map((line) => (
                    <li key={line.catalogItemId} className="border-b border-line pb-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{line.name}</span>
                        <span className="tabular-nums text-chili">
                          {formatBrlFromCents(line.priceCents * line.qty)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1 text-sm"
                          onClick={() => setQty(line.catalogItemId, line.qty - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1 text-sm"
                          onClick={() => setQty(line.catalogItemId, Math.min(99, line.qty + 1))}
                        >
                          +
                        </button>
                      </div>
                      <input
                        className="field mt-2 text-sm"
                        placeholder="Nota do item (opcional)"
                        maxLength={line.maxNoteLength}
                        value={line.note}
                        onChange={(e) =>
                          onChange(
                            cart.map((l) =>
                              l.catalogItemId === line.catalogItemId ? { ...l, note: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums text-chili">{formatBrlFromCents(cartCents + feeCents)}</span>
              </p>
              {feeCents > 0 ? (
                <p className="-mt-3 text-sm text-ink-soft">Inclui entrega {formatBrlFromCents(feeCents)}</p>
              ) : null}
            </>
          ) : cart.length > 0 ? (
            <p className="text-sm text-ink-soft">
              {cart.reduce((s, l) => s + l.qty, 0)} {cart.reduce((s, l) => s + l.qty, 0) === 1 ? "item" : "itens"} ·{" "}
              <span className="tabular-nums text-chili">{formatBrlFromCents(cartCents + feeCents)}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Cesta vazia. Volte e adicione itens.</p>
          )}

          {step === "phone" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">WhatsApp</span>
              <PhoneField value={phone} onValueChange={setPhone} autoComplete="tel" />
            </label>
          ) : null}

          {step === "profile" ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Seu nome</span>
                <input
                  className="field"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">CPF</span>
                <input
                  className="field"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfCnpjInput(e.target.value.replace(/\D/g, "").slice(0, 11)))}
                />
              </label>
            </>
          ) : null}

          {step === "address" ? (
            <>
              {name ? <p className="text-sm text-ink-soft">Olá, {name}.</p> : null}
              {!adding && addresses.length > 0 ? (
                <ul className="space-y-2">
                  {addresses.map((a) => (
                    <li key={a.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                          selectedId === a.id ? "border-chili bg-chili/5" : "border-line"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mt-1 accent-chili"
                          name="deliveryAddress"
                          checked={selectedId === a.id}
                          onChange={() => setSelectedId(a.id)}
                        />
                        <span>{formatAddress(a)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
              {adding ? (
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-soft">CEP</span>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={9}
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => {
                          setCep(formatCepInput(e.target.value));
                          setVia(null);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary !py-2 text-sm"
                        disabled={pending}
                        onClick={() => void searchCep()}
                      >
                        Buscar
                      </button>
                    </div>
                  </label>
                  {cepMsg ? <p className="text-sm text-chili">{cepMsg}</p> : null}
                  {via ? (
                    <>
                      <p className="text-sm">
                        {via.street} · {via.city}/{via.state}
                      </p>
                      <label className="block text-sm">
                        <span className="mb-1 block text-ink-soft">Bairro</span>
                        <input
                          className="field"
                          maxLength={80}
                          value={via.neighborhood}
                          onChange={(e) => setVia({ ...via, neighborhood: e.target.value })}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-ink-soft">Número</span>
                        <input
                          className="field"
                          maxLength={20}
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-ink-soft">Complemento (opcional)</span>
                        <input
                          className="field"
                          maxLength={80}
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setAdding(true);
                    setCep("");
                    setVia(null);
                    setNumber("");
                    setComplement("");
                    setCepMsg(null);
                  }}
                >
                  Adicionar endereço
                </button>
              )}
            </>
          ) : null}

          {step === "pay" ? (
            <>
              {selectedAddress ? (
                <p className="text-sm text-ink-soft">{formatAddress(selectedAddress)}</p>
              ) : null}
              <fieldset className="text-sm">
                <legend className="mb-2 text-ink-soft">Pagar na entrega</legend>
                <div className="flex gap-2">
                  {(
                    [
                      ["pix", "Pix"],
                      ["cash", "Dinheiro"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center ${
                        payOnDelivery === value ? "border-chili bg-chili/5 font-medium" : "border-line"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="payOnDelivery"
                        checked={payOnDelivery === value}
                        onChange={() => setPayOnDelivery(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Nota do pedido (opcional)</span>
                <textarea
                  className="field"
                  rows={2}
                  maxLength={240}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Fechar
          </button>
          {step !== "items" ? (
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setError(null);
                if (step === "phone") setStep("items");
                else if (step === "profile") setStep("phone");
                else if (step === "address" && adding && addresses.length > 0) setAdding(false);
                else if (step === "address") setStep(wasRegistered ? "phone" : "profile");
                else if (step === "pay") setStep("address");
              }}
            >
              Voltar
            </button>
          ) : null}
          {cart.length === 0 ? null : step === "items" ? (
            <button
              type="button"
              className="btn-primary !py-2 text-sm"
              onClick={() => {
                setError(null);
                setStep("phone");
              }}
            >
              Continuar
            </button>
          ) : step === "phone" ? (
            <button
              type="button"
              disabled={pending || phone.replace(/\D/g, "").length < 10}
              className="btn-primary !py-2 text-sm"
              onClick={() => void lookupPhone()}
            >
              {pending ? "Consultando…" : "Continuar"}
            </button>
          ) : step === "profile" ? (
            <button
              type="button"
              disabled={pending || name.trim().length < 2 || normalizeCpfCnpj(cpf).length !== 11}
              className="btn-primary !py-2 text-sm"
              onClick={() => void saveProfile()}
            >
              {pending ? "Salvando…" : "Continuar"}
            </button>
          ) : step === "address" && adding ? (
            <button
              type="button"
              disabled={pending || !via || number.trim().length < 1 || via.neighborhood.trim().length < 2}
              className="btn-primary !py-2 text-sm"
              onClick={() => void saveAddress()}
            >
              {pending ? "Salvando…" : "Salvar endereço"}
            </button>
          ) : step === "address" ? (
            <button
              type="button"
              disabled={!selectedId}
              className="btn-primary !py-2 text-sm"
              onClick={() => {
                setError(null);
                setStep("pay");
              }}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={pending || !selectedId}
              className="btn-primary !py-2 text-sm"
              onClick={() => void submit()}
            >
              {pending ? "Enviando…" : "Confirmar pedido"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
