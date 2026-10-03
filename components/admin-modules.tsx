"use client";

import { MODULE_GROUP_LABEL, type ModuleGroup, type ModuleType } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { AdminNightDialog } from "./admin-night-dialog";

type ModuleRow = {
  key: string;
  name: string;
  description: string | null;
  type: ModuleType;
  group: ModuleGroup;
  configurable: boolean;
  configSchema: Record<string, unknown> | null;
  defaultEnabled: boolean;
  listed: boolean;
  sortOrder: number;
  active: boolean;
};

type ModuleDraft = {
  key: string;
  name: string;
  description: string;
  type: ModuleType;
  group: ModuleGroup;
  configurable: boolean;
  defaultEnabled: boolean;
  listed: boolean;
  active: boolean;
};

const emptyDraft = (): ModuleDraft => ({
  key: "",
  name: "",
  description: "",
  type: "use",
  group: "operacao",
  configurable: false,
  defaultEnabled: true,
  listed: true,
  active: true,
});

function draftFromRow(m: ModuleRow): ModuleDraft {
  return {
    key: m.key,
    name: m.name,
    description: m.description ?? "",
    type: m.type,
    group: m.group,
    configurable: m.configurable,
    defaultEnabled: m.defaultEnabled,
    listed: m.listed,
    active: m.active,
  };
}

const TYPE_LABEL: Record<ModuleType, string> = { use: "Uso", config: "Configuração" };

export function AdminModules() {
  const [rows, setRows] = useState<ModuleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<ModuleRow | "new" | null>(null);

  async function load() {
    const data = await api<{ modules: ModuleRow[] }>("/v1/platform/modules");
    setRows(data.modules);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar módulos."));
  }, []);

  if (!rows) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Catálogo</p>
          <h1 className="mt-2 font-serif text-3xl">Módulos</h1>
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
      <p className="text-sm text-white/45">
        Clique no módulo para editar. Atribua-os a cada plano em Planos.
      </p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rows.map((m) => (
          <li key={m.key}>
            <button
              type="button"
              onClick={() => {
                setOk(null);
                setEditing(m);
              }}
              className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {m.name} <span className="text-white/40">{m.key}</span>
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {MODULE_GROUP_LABEL[m.group]} · {TYPE_LABEL[m.type]}
                </p>
              </div>
              <span
                className={`mt-1 inline-block w-fit rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider sm:mt-0 ${
                  m.active ? "border-white/15 text-white/70" : "border-amber/40 text-amber"
                }`}
              >
                {m.active ? "Ativo" : "Inativo"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-white/45">Nenhum módulo ainda.</p> : null}

      {editing ? (
        <ModuleDialog
          module={editing === "new" ? null : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setOk(msg);
            setError(null);
            await load();
            setEditing(null);
          }}
          setPending={setPending}
        />
      ) : null}
    </div>
  );
}

function ModuleDialog({
  module,
  pending,
  onClose,
  onSaved,
  setPending,
}: {
  module: ModuleRow | null;
  pending: boolean;
  onClose: () => void;
  onSaved: (msg: string) => Promise<void>;
  setPending: (v: boolean) => void;
}) {
  const creating = module === null;
  const [draft, setDraft] = useState<ModuleDraft>(() => (module ? draftFromRow(module) : emptyDraft()));
  const [localError, setLocalError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setLocalError(null);
    try {
      if (creating) {
        await api("/v1/platform/modules", {
          method: "POST",
          body: JSON.stringify({
            key: draft.key.trim(),
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            type: draft.type,
            group: draft.group,
            configurable: draft.configurable,
            defaultEnabled: draft.defaultEnabled,
            listed: draft.listed,
          }),
        });
        await onSaved("Módulo criado. Atribua-o a um plano em Planos.");
      } else {
        await api(`/v1/platform/modules/${module.key}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            type: draft.type,
            group: draft.group,
            configurable: draft.configurable,
            defaultEnabled: draft.defaultEnabled,
            listed: draft.listed,
            active: draft.active,
          }),
        });
        await onSaved(`Módulo ${draft.name} salvo.`);
      }
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminNightDialog
      kicker="Módulo"
      title={creating ? "Novo módulo" : draft.name || module.name}
      pending={pending}
      onClose={onClose}
    >
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Chave (slug)</span>
          <input
            className="field-night"
            value={draft.key}
            onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
            placeholder="reports_pro"
            disabled={!creating}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Nome</span>
          <input
            className="field-night"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Relatórios Pro"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Tipo</span>
          <select
            className="field-night"
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ModuleType }))}
          >
            <option value="use">Uso</option>
            <option value="config">Configuração</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Grupo</span>
          <select
            className="field-night"
            value={draft.group}
            onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value as ModuleGroup }))}
          >
            <option value="visual">Visual</option>
            <option value="operacao">Operação</option>
            <option value="config">Configuração</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-white/60">Descrição</span>
        <input
          className="field-night"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.configurable}
            onChange={(e) => setDraft((d) => ({ ...d, configurable: e.target.checked }))}
          />
          Configurável pelo estabelecimento
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.defaultEnabled}
            onChange={(e) => setDraft((d) => ({ ...d, defaultEnabled: e.target.checked }))}
          />
          Ligado por padrão
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.listed}
            onChange={(e) => setDraft((d) => ({ ...d, listed: e.target.checked }))}
          />
          Listado
        </label>
        {!creating ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
            />
            Ativo
          </label>
        ) : null}
      </div>
      {localError ? <p className="mt-3 text-sm text-chili">{localError}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className="btn-ghost text-white/80">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
        >
          {pending ? "Salvando…" : creating ? "Criar" : "Salvar"}
        </button>
      </div>
    </AdminNightDialog>
  );
}
