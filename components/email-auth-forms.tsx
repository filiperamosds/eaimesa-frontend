"use client";

import {
  acceptStaffInviteSchema,
  ERROR_CODES,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@eaimesa/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { resolveOwnerLoginTarget } from "../lib/auth-redirect";
import type { LoginResponse, StaffInvitePreview } from "../lib/types";

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.ComponentProps<"input">["inputMode"];
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        required
      />
    </label>
  );
}

export function ConfirmEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = verifyEmailSchema.safeParse({ email, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    setPending(true);
    try {
      const result = await api<LoginResponse>("/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      router.push(resolveOwnerLoginTarget(result));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível confirmar.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Informe o e-mail.");
      return;
    }
    setResending(true);
    try {
      await api("/v1/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setInfo("Se o e-mail ainda não estiver confirmado, enviamos um novo código.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reenviar.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Código de 6 dígitos"
        value={code}
        onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
        pattern="\d{6}"
      />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {info ? <p className="text-sm text-sage">{info}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Confirmando…" : "Confirmar e-mail"}
      </button>
      <button type="button" disabled={resending} onClick={() => void resend()} className="btn-ghost w-full">
        {resending ? "Reenviando…" : "Reenviar código"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Já confirmou?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Informe o e-mail.");
      return;
    }
    setPending(true);
    try {
      await api("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-ink-soft">
          Se o e-mail existir, enviamos um código de 6 dígitos. Ele vale 15 minutos.
        </p>
        <Link
          href={`/redefinir-senha?email=${encodeURIComponent(email.trim().toLowerCase())}`}
          className="btn-primary inline-flex w-full justify-center"
        >
          Informar o código
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enviando…" : "Enviar código"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        <Link href="/login" className="font-medium text-ink underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ email, code, password, passwordConfirmation });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    setPending(true);
    try {
      await api("/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Código de 6 dígitos"
        value={code}
        onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
      />
      <Field
        label="Nova senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Field
        label="Confirmar senha"
        type="password"
        value={passwordConfirmation}
        onChange={setPasswordConfirmation}
        autoComplete="new-password"
      />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Salvando…" : "Salvar senha"}
      </button>
    </form>
  );
}

export function StaffInviteForm() {
  const router = useRouter();
  const token = (useSearchParams().get("token") ?? "").trim();
  const [preview, setPreview] = useState<StaffInvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api<StaffInvitePreview>(`/v1/auth/staff-invite/${token}`)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === ERROR_CODES.INVITE_EXPIRED) {
          setError("Este convite expirou. Peça um novo ao estabelecimento.");
        } else {
          setError(err instanceof ApiError ? err.message : "Convite inválido.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = acceptStaffInviteSchema.safeParse({ password, passwordConfirmation });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise as senhas.");
      return;
    }
    setPending(true);
    try {
      const result = await api<LoginResponse>(`/v1/auth/staff-invite/${token}`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      router.push(resolveOwnerLoginTarget(result));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a senha.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-chili">Link incompleto. Abra o convite a partir do e-mail.</p>
    );
  }

  if (loading) {
    return <p className="text-ink-soft">Carregando convite…</p>;
  }
  if (!preview) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-chili">{error ?? "Convite inválido."}</p>
        <Link href="/login" className="font-medium text-ink underline">
          Ir ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-ink-soft">
        {preview.name}, você foi convidado para <span className="font-medium text-ink">{preview.venueName}</span>
        {preview.roleLabel ? ` (${preview.roleLabel})` : ""}.
      </p>
      <p className="text-sm text-ink-soft">{preview.email}</p>
      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Field
        label="Confirmar senha"
        type="password"
        value={passwordConfirmation}
        onChange={setPasswordConfirmation}
        autoComplete="new-password"
      />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Salvando…" : "Criar senha e entrar"}
      </button>
    </form>
  );
}
