"use client";

import {
  formatCepInput,
  formatCpfCnpjInput,
  formatPhoneInput,
  isRepresentativePersisted,
  pickRepresentative,
  representativeSchema,
} from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";

export function RepresentativeForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Venue>("/v1/owner/venue")
      .then((v) => {
        const r = pickRepresentative(v.representative);
        if (r) {
          setName(r.name);
          setCpfCnpj(formatCpfCnpjInput(r.cpfCnpj));
          setEmail(r.email || defaultEmail);
          setPhone(formatPhoneInput(r.phone ?? ""));
          setPostalCode(formatCepInput(r.postalCode ?? ""));
          setAddressNumber(r.addressNumber);
        } else if (defaultEmail) {
          setEmail((cur) => cur || defaultEmail);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."))
      .finally(() => setLoading(false));
  }, [defaultEmail]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const parsed = representativeSchema.safeParse({
      name,
      cpfCnpj,
      email,
      phone,
      postalCode,
      addressNumber,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    setPending(true);
    try {
      const v = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ representative: parsed.data }),
      });
      const r = pickRepresentative(v.representative);
      if (!isRepresentativePersisted(r)) {
        setError(
          "O servidor não confirmou nome e CPF. Salve de novo; se persistir, a API não gravou o responsável.",
        );
        return;
      }
      setName(r.name);
      setCpfCnpj(formatCpfCnpjInput(r.cpfCnpj));
      setEmail(r.email || defaultEmail);
      setPhone(formatPhoneInput(r.phone ?? ""));
      setPostalCode(formatCepInput(r.postalCode ?? ""));
      setAddressNumber(r.addressNumber);
      setMsg("Responsável salvo. O checkout de pagamento usa estes dados.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando…</p>;

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Nome completo</span>
        <input
          className="field"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={80}
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
          onChange={(e) => setCpfCnpj(formatCpfCnpjInput(e.target.value))}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">E-mail</span>
        <input
          className="field"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-ink-soft">
          Começa com o e-mail da conta. Nome e CPF deveriam vir do cadastro da empresa.
        </p>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Telefone</span>
        <input
          className="field"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98888-7777"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">CEP</span>
          <input
            className="field font-mono tracking-wide"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={postalCode}
            onChange={(e) => setPostalCode(formatCepInput(e.target.value))}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Número</span>
          <input
            className="field"
            autoComplete="address-line2"
            value={addressNumber}
            onChange={(e) => setAddressNumber(e.target.value)}
            required
            maxLength={20}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary !py-2">
        {pending ? "Salvando…" : "Salvar responsável"}
      </button>
    </form>
  );
}
