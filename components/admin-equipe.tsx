"use client";

import {
  createPlatformUserSchema,
  ERROR_CODES,
  platformUserListSchema,
  type PlatformUser,
} from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { AdminNightDialog } from "./admin-night-dialog";

function formatCreated(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function errorMessage(err: unknown): string {
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

export function AdminEquipe() {
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<PlatformUser | "new" | null>(null);

  function handleAuth(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  async function load() {
    const data = platformUserListSchema.parse(await api("/v1/platform/users"));
    setUsers(data.users);
  }

  useEffect(() => {
    load().catch((err) => {
      if (handleAuth(err)) return;
      setError(errorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!users) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Console</p>
          <h1 className="mt-2 font-serif text-3xl">Equipe</h1>
        </div>
        <button
          type="button"
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
          onClick={() => {
            setOk(null);
            setEditing("new");
          }}
        >
          Adicionar
        </button>
      </div>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        Clique no operador para ver o cadastro. Só quem já está no console cadastra colegas — não existe
        cadastro público de admin.
      </p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => {
                setOk(null);
                setEditing(u);
              }}
              className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{u.name}</p>
                <p className="mt-1 truncate text-sm text-white/55">
                  {u.email} · {formatCreated(u.createdAt)}
                </p>
              </div>
              <span
                className={`mt-1 inline-block w-fit rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider sm:mt-0 ${
                  u.active ? "border-white/15 text-white/70" : "border-amber/40 text-amber"
                }`}
              >
                {u.active ? "Ativo" : "Inativo"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {users.length === 0 ? <p className="text-sm text-white/45">Nenhum operador ainda.</p> : null}

      {editing ? (
        <EquipeDialog
          user={editing === "new" ? null : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setOk(msg);
            setError(null);
            await load();
            setEditing(null);
          }}
          onAuthError={(err) => {
            if (!handleAuth(err)) setError(errorMessage(err));
          }}
          setPending={setPending}
        />
      ) : null}
    </div>
  );
}

function EquipeDialog({
  user,
  pending,
  onClose,
  onSaved,
  onAuthError,
  setPending,
}: {
  user: PlatformUser | null;
  pending: boolean;
  onClose: () => void;
  onSaved: (msg: string) => Promise<void>;
  onAuthError: (err: unknown) => void;
  setPending: (v: boolean) => void;
}) {
  const creating = user === null;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function save() {
    setLocalError(null);
    const parsed = createPlatformUserSchema.safeParse({
      name,
      email,
      password,
      passwordConfirmation,
      active: true,
    });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    setPending(true);
    try {
      await api("/v1/platform/users", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      await onSaved("Operador cadastrado. Ele já pode entrar em /admin/login.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthError(err);
        return;
      }
      setLocalError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminNightDialog
      kicker="Operador"
      title={creating ? "Novo operador" : user.name}
      pending={pending}
      onClose={onClose}
    >
      {creating ? (
        <p className="mt-1 text-sm text-white/45">
          Nome, e-mail e senha (mínimo 8 caracteres, com confirmação). Entra ativo.
        </p>
      ) : (
        <p className="mt-1 text-sm text-white/45">Operador do console. Nome e e-mail não mudam por aqui.</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Nome</span>
          <input
            className="field-night"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required={creating}
            minLength={2}
            maxLength={80}
            disabled={!creating}
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
            required={creating}
            maxLength={190}
            disabled={!creating}
          />
        </label>
      </div>

      {creating ? (
        <>
          <label className="mt-3 block text-sm">
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
          <label className="mt-3 block text-sm">
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
        </>
      ) : (
        <p className="mt-3 text-sm text-white/55">Criado em {formatCreated(user.createdAt)}</p>
      )}

      {localError ? <p className="mt-3 text-sm text-chili">{localError}</p> : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className="btn-ghost text-white/80">
          {creating ? "Cancelar" : "Fechar"}
        </button>
        {creating ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void save()}
            className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
          >
            {pending ? "Cadastrando…" : "Criar"}
          </button>
        ) : null}
      </div>
    </AdminNightDialog>
  );
}
