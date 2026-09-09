"use client";

import { modifierRuleLabel, type ModifierGroup } from "@eaimesa/shared";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { MoneyField } from "./masked-fields";

export function ModifierGroupsEditor({
  groups,
  onChange,
}: {
  groups: ModifierGroup[];
  onChange: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [minSelect, setMinSelect] = useState(0);
  const [maxSelect, setMaxSelect] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/v1/owner/catalog/modifier-groups", {
        method: "POST",
        body: JSON.stringify({
          name,
          minSelect,
          maxSelect,
          sortOrder: groups.length,
        }),
      });
      setName("");
      setMinSelect(0);
      setMaxSelect(1);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface p-5">
      <h3 className="font-serif text-2xl">Adicionais e modos</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Categorias reutilizáveis: molho, extra de bacon, acompanhamentos. Depois ligue no item.
      </p>
      <form onSubmit={(e) => void addGroup(e)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_5.5rem_5.5rem_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex. Molhos)"
          className="field"
          required
        />
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Mínimo</span>
          <input
            type="number"
            min={0}
            max={40}
            value={minSelect}
            onChange={(e) => setMinSelect(Math.max(0, Number(e.target.value) || 0))}
            className="field"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Máximo</span>
          <input
            type="number"
            min={1}
            max={40}
            value={maxSelect}
            onChange={(e) => setMaxSelect(Math.max(1, Number(e.target.value) || 1))}
            className="field"
          />
        </label>
        <button type="submit" className="btn-primary !bg-sage !py-2 text-sm shadow-none sm:self-end" disabled={saving}>
          {saving ? "…" : "Criar categoria"}
        </button>
      </form>
      <p className="mt-2 text-xs text-ink-soft">
        Mínimo 0 = opcional. 1 a 1 = um molho. 1 a 8 = acompanhamentos. Preço vazio no item = sem taxa.
      </p>
      {error ? <p className="mt-2 text-sm text-chili">{error}</p> : null}
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Nenhuma categoria ainda.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {groups.map((group) => (
            <ModifierGroupBlock key={group.id} group={group} onChange={onChange} onError={setError} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ModifierGroupBlock({
  group,
  onChange,
  onError,
}: {
  group: ModifierGroup;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [name, setName] = useState(group.name);
  const [minSelect, setMinSelect] = useState(group.minSelect);
  const [maxSelect, setMaxSelect] = useState(group.maxSelect);
  const [optName, setOptName] = useState("");
  const [optCents, setOptCents] = useState<number | null>(null);

  async function saveMeta() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, minSelect, maxSelect }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar a categoria.");
    }
  }

  async function toggleActive() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !group.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar.");
    }
  }

  async function remove() {
    if (!confirm("Remover esta categoria e os itens dela?")) return;
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-groups/${group.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  async function addOption(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-groups/${group.id}/options`, {
        method: "POST",
        body: JSON.stringify({
          name: optName,
          priceCents: optCents ?? 0,
          sortOrder: group.options.length,
        }),
      });
      setOptName("");
      setOptCents(null);
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao adicionar o item.");
    }
  }

  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void saveMeta()}
          className="min-w-40 flex-1 bg-transparent font-medium outline-none"
        />
        <span className={`text-xs ${group.active ? "text-sage" : "text-ink-soft"}`}>
          {group.active ? "visível" : "oculta"}
        </span>
        <button type="button" onClick={() => void toggleActive()} className="text-sm text-ink-soft hover:text-ink">
          {group.active ? "Ocultar" : "Mostrar"}
        </button>
        <button type="button" onClick={() => void remove()} className="text-sm text-chili">
          Excluir
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Mínimo</span>
          <input
            type="number"
            min={0}
            max={40}
            value={minSelect}
            onChange={(e) => setMinSelect(Math.max(0, Number(e.target.value) || 0))}
            onBlur={() => void saveMeta()}
            className="field w-20 py-1"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Máximo</span>
          <input
            type="number"
            min={1}
            max={40}
            value={maxSelect}
            onChange={(e) => setMaxSelect(Math.max(1, Number(e.target.value) || 1))}
            onBlur={() => void saveMeta()}
            className="field w-20 py-1"
          />
        </label>
        <p className="pb-2 text-xs text-ink-soft">{modifierRuleLabel(minSelect, maxSelect)}</p>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {group.options.map((opt) => (
          <ModifierOptionRow key={opt.id} option={opt} onChange={onChange} onError={onError} />
        ))}
      </ul>
      <form onSubmit={(e) => void addOption(e)} className="mt-3 flex flex-wrap gap-2">
        <input
          value={optName}
          onChange={(e) => setOptName(e.target.value)}
          placeholder="Item (ex. Cheddar)"
          className="field min-w-40 flex-1 py-1.5 text-sm"
          required
        />
        <MoneyField
          cents={optCents}
          onCentsChange={setOptCents}
          className="field w-32 py-1.5 text-sm"
          placeholder="Preço (opcional)"
        />
        <button type="submit" className="btn-secondary !py-1.5 text-sm">
          Adicionar
        </button>
      </form>
    </li>
  );
}

function ModifierOptionRow({
  option,
  onChange,
  onError,
}: {
  option: ModifierGroup["options"][number];
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [name, setName] = useState(option.name);
  const [cents, setCents] = useState<number | null>(option.priceCents);

  async function save() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-options/${option.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, priceCents: cents ?? 0 }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar o item.");
    }
  }

  async function toggle() {
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-options/${option.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !option.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar.");
    }
  }

  async function remove() {
    if (!confirm("Remover este item da categoria?")) return;
    onError(null);
    try {
      await api(`/v1/owner/catalog/modifier-options/${option.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao excluir.");
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void save()}
        className={`min-w-32 flex-1 bg-transparent outline-none ${option.active ? "" : "text-ink-soft line-through"}`}
      />
      <MoneyField
        cents={cents}
        onCentsChange={setCents}
        onBlur={() => void save()}
        className="field w-28 py-1 text-sm"
        placeholder="—"
      />
      <button type="button" onClick={() => void toggle()} className="text-ink-soft hover:text-ink">
        {option.active ? "Ocultar" : "Mostrar"}
      </button>
      <button type="button" onClick={() => void remove()} className="text-chili">
        Excluir
      </button>
    </li>
  );
}
