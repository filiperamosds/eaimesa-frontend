"use client";

import {
  createPlatformUserSchema,
  ERROR_CODES,
  platformUserListSchema,
  type PlatformUser,
} from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

type ToastKind = "ok" | "err";

function formatCreated(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function toastMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === ERROR_CODES.EMAIL_TAKEN) {
      return err.message || "Este e-mail já é operador da plataforma.";
    }
    if (err.code === ERROR_CODES.VALIDATION_ERROR) {
      return err.message || "Confira nome, e-mail e senha (mínimo 8 caracteres).";
    }
    return err.message;
  }
  return "Não foi possível concluir.";
}

function AdminToast({
  kind,
  message,
  onDismiss,
}: {
  kind: ToastKind;
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl px-4 py-3 text-sm shadow-lg ${
        kind === "ok" ? "bg-sage text-white" : "bg-chili text-white"
      }`}
    >
      {message}
    </div>
  );
}

export function AdminEquipe() {
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/admin/login");
      return;
    }
    setToast({ kind: "err", message: toastMessage(err) });
  }

  async function load() {
    const data = platformUserListSchema.parse(await api("/v1/platform/users"));
    setUsers(data.users);
  }

  useEffect(() => {
    let cancelled = false;
    api("/v1/platform/users")
      .then((raw) => {
        if (cancelled) return;
        setUsers(platformUserListSchema.parse(raw).users);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/admin/login");
          return;
        }
        setToast({ kind: "err", message: toastMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);
    const parsed = createPlatformUserSchema.safeParse({
      name,
      email,
      password,
      passwordConfirmation,
      active: true,
    });
    if (!parsed.success) {
      setToast({ kind: "err", message: parsed.error.issues[0]?.message ?? "Confira os campos." });
      return;
    }
    setPending(true);
    try {
      await api("/v1/platform/users", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setName("");
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setToast({ kind: "ok", message: "Operador cadastrado. Ele já pode entrar em /admin/login." });
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setPending(false);
    }
  }

  if (!users) {
    return <p className="text-white/55">{toast?.kind === "err" ? toast.message : "Carregando…"}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Console</p>
        <h1 className="mt-2 font-serif text-3xl">Equipe</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Operadores da plataforma EaiMesa. Só quem já está logado no console cadastra colegas — não
          existe cadastro público de admin.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-dashed border-amber/40 bg-white/5 p-5">
        <p className="font-medium">Convidar operador</p>
        <p className="mt-1 text-sm text-white/45">Nome, e-mail e senha (mínimo 8 caracteres, com confirmação). Entra ativo.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Nome</span>
            <input
              className="field-night"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">E-mail</span>
            <input
              className="field-night"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
              maxLength={190}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm sm:max-w-sm">
          <span className="mb-1 block text-white/60">Senha</span>
          <input
            className="field-night"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <label className="mt-3 block text-sm sm:max-w-sm">
          <span className="mb-1 block text-white/60">Confirmar senha</span>
          <input
            className="field-night"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary mt-4 !py-2 text-sm">
          {pending ? "Cadastrando…" : "Cadastrar operador"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-white/45">
                  Nenhum operador cadastrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.active
                          ? "rounded-full bg-sage/20 px-2 py-0.5 text-xs text-sage-soft"
                          : "rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/45"
                      }
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/55">{formatCreated(u.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toast ? <AdminToast kind={toast.kind} message={toast.message} onDismiss={dismissToast} /> : null}
    </div>
  );
}
