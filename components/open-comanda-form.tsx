"use client";

import { ERROR_CODES } from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { OpenComandaResponse } from "../lib/types";
import { PhoneField } from "./masked-fields";

const PHONE_IN_USE =
  "Este telefone já tem uma comanda aberta. Feche a outra ou use outro número.";

export function OpenComandaForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phoneBlocked, setPhoneBlocked] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneBlocked(false);
    setPending(true);
    try {
      const result = await api<OpenComandaResponse>("/v1/guest/tabs", {
        method: "POST",
        body: JSON.stringify({ name, phone }),
      });
      router.replace(result.redirectPath || `/${slug}`);
      router.refresh();
    } catch (err) {
      const blocked = err instanceof ApiError && err.code === ERROR_CODES.TAB_ALREADY_OPEN;
      setPhoneBlocked(blocked);
      setError(blocked ? PHONE_IN_USE : err instanceof ApiError ? err.message : "Não foi possível abrir a comanda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-xs space-y-4 text-left">
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Seu nome</span>
        <input
          className="field"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Telefone</span>
        <PhoneField
          className={`field${phoneBlocked ? " border-chili" : ""}`}
          value={phone}
          onValueChange={(next) => {
            setPhone(next);
            if (phoneBlocked) {
              setPhoneBlocked(false);
              setError(null);
            }
          }}
          required
          aria-invalid={phoneBlocked}
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-chili/30 bg-chili/10 px-3 py-2 text-sm text-chili" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Abrindo…" : "Abrir minha comanda"}
      </button>
    </form>
  );
}
