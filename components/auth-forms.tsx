"use client";

import { ERROR_CODES, formatCpfCnpjInput, PLANS, registerSchema, SLUG_MIN, slugifyFromName, withSlugSuffix } from "@eaimesa/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { resolveOwnerLoginTarget } from "../lib/auth-redirect";
import type { BillingPlan, BillingPlansPayload } from "../lib/load-billing-plans";
import { useMenuSlugFromName } from "../lib/menu-slug";
import type { LoginResponse, Session } from "../lib/types";
import { PlanPrice } from "./plan-price";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<Session>("/v1/auth/me")
      .then((session) => {
        if (cancelled) return;
        router.replace(resolveOwnerLoginTarget(session, next));
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await api<LoginResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(resolveOwnerLoginTarget(result, next));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return <p className="text-ink-soft">Verificando sessão…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Garçom ou caixa? Mesmo login — vocês entram na tela da equipe. Monitor da cozinha ou do bar
        (perfil Painel) abre a fila.
      </p>
      <p className="text-center text-sm text-ink-soft">
        Novo estabelecimento?{" "}
        <Link href="/cadastro" className="font-medium text-ink underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const requested = useSearchParams().get("plano");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeCpf, setRepresentativeCpf] = useState("");
  const [plan, setPlan] = useState(requested && requested.length >= 3 ? requested : "cardapio");
  const [plans, setPlans] = useState<BillingPlan[]>(Object.values(PLANS));
  const [trialDays, setTrialDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const slug = useMenuSlugFromName(venueName);

  useEffect(() => {
    api<BillingPlansPayload>("/v1/billing/plans")
      .then((data) => {
        const listed = data.plans.filter((p) => p.listed !== false);
        if (listed.length) setPlans(listed);
        setTrialDays(data.trialDays);
        setPlan((cur) => (listed.some((p) => p.id === cur) ? cur : (listed[0]?.id ?? cur)));
      })
      .catch(() => {
        /* fallback PLANS */
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({
      email,
      password,
      venueName,
      slug,
      plan,
      representative: { name: representativeName, cpfCnpj: representativeCpf },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    setPending(true);
    try {
      let nextSlug = parsed.data.slug;
      let result: LoginResponse | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          result = await api<LoginResponse>("/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({ ...parsed.data, slug: nextSlug }),
          });
          break;
        } catch (err) {
          const taken = err instanceof ApiError && err.code === ERROR_CODES.SLUG_TAKEN;
          if (!taken || attempt === 7) throw err;
          nextSlug = withSlugSuffix(slugifyFromName(parsed.data.venueName), attempt + 2);
        }
      }
      if (!result) throw new Error("Não foi possível cadastrar.");
      router.push(result.redirectPath || "/painel/configuracoes/cardapio");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Nome do estabelecimento"
        value={venueName}
        onChange={setVenueName}
        placeholder="Seu Estabelecimento"
      />
      <div>
        <Field
          label="URL do cardápio"
          value={slug}
          onChange={() => undefined}
          placeholder="seu-estabelecimento"
          disabled
        />
        <p className="mt-1 text-xs text-ink-soft">eaimesa.com.br/{slug || "sua-casa"}</p>
      </div>
      <Field
        label="Nome do responsável"
        value={representativeName}
        onChange={setRepresentativeName}
        autoComplete="name"
        placeholder="Maria Silva"
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">CPF do responsável</span>
        <input
          className="field font-mono tracking-wide"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={representativeCpf}
          onChange={(e) => setRepresentativeCpf(formatCpfCnpjInput(e.target.value.replace(/\D/g, "").slice(0, 11)))}
          required
        />
      </label>
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Plano (trial de {trialDays} dias)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-2xl border px-3 py-3 text-sm ${
                plan === p.id ? "border-chili bg-chili/5" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={plan === p.id}
                onChange={() => setPlan(p.id)}
                className="sr-only"
              />
              <span className="block font-medium">{p.name}</span>
              <span className="mt-1 block text-chili">
                <PlanPrice
                  priceCents={p.priceCents}
                  promoPriceCents={p.promoPriceCents}
                  suffix="/mês"
                  className="text-base"
                />
              </span>
              <span className="mt-1 block text-xs text-ink-soft">{p.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending || slug.length < SLUG_MIN} className="btn-primary w-full">
        {pending ? "Criando…" : "Criar cardápio"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        required={!disabled}
        readOnly={disabled}
      />
    </label>
  );
}
