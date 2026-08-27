"use client";

import { MODULE_GROUP_LABEL, type ModuleGroup, type ModuleType } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

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

type CreateDraft = {
  key: string;
  name: string;
  description: string;
  type: ModuleType;
  group: ModuleGroup;
  configurable: boolean;
  defaultEnabled: boolean;
  listed: boolean;
};

const emptyCreate = (): CreateDraft => ({
  key: "",
  name: "",
  description: "",
  type: "use",
  group: "operacao",
  configurable: false,
  defaultEnabled: true,
  listed: true,
});

const TYPE_LABEL: Record<ModuleType, string> = { use: "Uso", config: "Configuração" };

export function AdminModules() {
  const [rows, setRows] = useState<ModuleRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ModuleRow>>({});
  const [create, setCreate] = useState<CreateDraft>(emptyCreate);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    const data = await api<{ modules: ModuleRow[] }>("/v1/platform/modules");
    setRows(data.modules);
    setDrafts(Object.fromEntries(data.modules.map((m) => [m.key, { ...m }])));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar módulos."));
  }, []);

  async function save(key: string) {
    const d = drafts[key];
    if (!d) return;
    setPending(key);
    setError(null);
    setOk(null);
    try {
      await api(`/v1/platform/modules/${key}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: d.name,
          description: d.description,
          type: d.type,
          group: d.group,
          configurable: d.configurable,
          defaultEnabled: d.defaultEnabled,
          listed: d.listed,
          active: d.active,
        }),
      });
      setOk(`Módulo ${d.name} salvo.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(null);
    }
  }

  async function createModule() {
    setPending("create");
    setError(null);
    setOk(null);
    try {
      await api("/v1/platform/modules", {
        method: "POST",
        body: JSON.stringify({
          key: create.key.trim(),
          name: create.name.trim(),
          description: create.description.trim() || null,
          type: create.type,
          group: create.group,
          configurable: create.configurable,
          defaultEnabled: create.defaultEnabled,
          listed: create.listed,
        }),
      });
      setOk("Módulo criado. Atribua-o a um plano em Planos.");
      setCreate(emptyCreate());
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    } finally {
      setPending(null);
    }
  }

  if (!rows) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Catálogo</p>
        <h1 className="mt-2 font-serif text-3xl">Módulos</h1>
        <p className="mt-2 text-sm text-white/55">
          Módulos de uso (Kanban, mesas, chamar garçom, financeiro…) e de configuração. Atribua-os a
          cada plano em <span className="text-white/80">Planos</span>.
        </p>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <div className="rounded-2xl border border-dashed border-amber/40 bg-white/5 p-5">
        <p className="font-medium">Criar módulo</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Chave (slug)</span>
            <input
              className="field-night"
              value={create.key}
              onChange={(e) => setCreate((c) => ({ ...c, key: e.target.value }))}
              placeholder="reports_pro"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Nome</span>
            <input
              className="field-night"
              value={create.name}
              onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
              placeholder="Relatórios Pro"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Tipo</span>
            <select
              className="field-night"
              value={create.type}
              onChange={(e) => setCreate((c) => ({ ...c, type: e.target.value as ModuleType }))}
            >
              <option value="use">Uso</option>
              <option value="config">Configuração</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Grupo</span>
            <select
              className="field-night"
              value={create.group}
              onChange={(e) => setCreate((c) => ({ ...c, group: e.target.value as ModuleGroup }))}
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
            value={create.description}
            onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={create.configurable}
              onChange={(e) => setCreate((c) => ({ ...c, configurable: e.target.checked }))}
            />
            Configurável pelo estabelecimento
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={create.defaultEnabled}
              onChange={(e) => setCreate((c) => ({ ...c, defaultEnabled: e.target.checked }))}
            />
            Ligado por padrão
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={create.listed}
              onChange={(e) => setCreate((c) => ({ ...c, listed: e.target.checked }))}
            />
            Listado
          </label>
        </div>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void createModule()}
          className="btn-primary mt-4 !py-2 text-sm"
        >
          Criar módulo
        </button>
      </div>

      {rows.map((m) => {
        const d = drafts[m.key] ?? m;
        return (
          <div key={m.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-white/40">{m.key}</p>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60">
                {MODULE_GROUP_LABEL[d.group]} · {TYPE_LABEL[d.type]}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Nome</span>
                <input
                  className="field-night"
                  value={d.name}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, name: e.target.value } }))}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Grupo</span>
                <select
                  className="field-night"
                  value={d.group}
                  onChange={(e) =>
                    setDrafts((cur) => ({ ...cur, [m.key]: { ...d, group: e.target.value as ModuleGroup } }))
                  }
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
                value={d.description ?? ""}
                onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, description: e.target.value } }))}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.configurable}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, configurable: e.target.checked } }))}
                />
                Configurável
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.defaultEnabled}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, defaultEnabled: e.target.checked } }))}
                />
                Ligado por padrão
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.listed}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, listed: e.target.checked } }))}
                />
                Listado
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.active}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [m.key]: { ...d, active: e.target.checked } }))}
                />
                Ativo
              </label>
            </div>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void save(m.key)}
              className="btn-primary mt-4 !py-2 text-sm"
            >
              Salvar {d.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
