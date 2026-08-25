"use client";

import { memberRoleLabel, PLAN_BAR_MAX_STAFF, type MemberRole } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, StaffMember } from "../lib/types";

type StaffPayload = {
  staff: StaffMember[];
  maxActive: number;
  activeCount: number;
};

function memberRoleValue(role: StaffMember["role"]): MemberRole {
  return role === "cashier" || role === "panel" ? role : "staff";
}

function CategoryChecklist({
  categories,
  selected,
  onChange,
}: {
  categories: CatalogCategory[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Cadastre categorias no cardápio para escolher o que chega neste Kanban.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {categories.map((cat) => {
        const checked = selected.includes(cat.id);
        return (
          <li key={cat.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-chili"
                checked={checked}
                onChange={() => {
                  onChange(checked ? selected.filter((id) => id !== cat.id) : [...selected, cat.id]);
                }}
              />
              <span>
                {cat.name}
                {cat.active ? null : <span className="text-ink-soft"> (oculta)</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function StaffEditor() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [maxActive, setMaxActive] = useState(PLAN_BAR_MAX_STAFF);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>("staff");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  async function load() {
    const [team, catalog] = await Promise.all([
      api<StaffPayload>("/v1/owner/staff"),
      api<{ categories: CatalogCategory[] }>("/v1/owner/catalog"),
    ]);
    setStaff(team.staff);
    setMaxActive(team.maxActive);
    setActiveCount(team.activeCount);
    setCategories(catalog.categories);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (role === "panel" && categoryIds.length === 0) {
      setError("Selecione ao menos uma categoria para o Kanban deste painel.");
      return;
    }
    try {
      await api("/v1/owner/staff", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          categoryIds: role === "panel" ? categoryIds : undefined,
        }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setCategoryIds([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    }
  }

  async function toggleActive(row: StaffMember) {
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !row.active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  async function changeRole(row: StaffMember, next: MemberRole) {
    if (memberRoleValue(row.role) === next) return;
    if (next === "panel" && (row.categoryIds ?? []).length === 0) {
      setError("Marque as categorias do Kanban antes de mudar o perfil para Painel.");
      return;
    }
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: next,
          categoryIds: next === "panel" ? (row.categoryIds ?? []) : [],
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o perfil.");
    }
  }

  async function changeCategories(row: StaffMember, nextIds: string[]) {
    if (nextIds.length === 0) {
      setError("O painel precisa de ao menos uma categoria.");
      return;
    }
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ categoryIds: nextIds }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar as categorias.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta pessoa? Ela não poderá mais entrar.")) return;
    setError(null);
    try {
      await api(`/v1/owner/staff/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando equipe…</p>;

  return (
    <div>
      <div className="surface mb-6 border-sage/20 bg-sage-soft/40 p-4 text-sm text-ink-soft">
        <p className="font-medium text-ink">Equipe entra em /login (mesmo acesso do painel).</p>
        <p className="mt-1">
          Garçom e caixa caem em /garcom. Painel cai no Kanban de /painel/pedidos (monitor da cozinha
          ou do bar), só com as categorias escolhidas. Máximo {maxActive} ativos no plano Auto
          atendimento.
        </p>
      </div>
      <p className="mb-6 text-sm text-ink-soft">
        {activeCount}/{maxActive} pessoas ativas
      </p>
      <form onSubmit={add} className="surface mb-8 space-y-3 p-4">
        <p className="font-medium">Nova pessoa</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="field"
            required
            minLength={2}
          />
          <select
            className="field"
            value={role}
            onChange={(e) => {
              const next = e.target.value as MemberRole;
              setRole(next);
              if (next !== "panel") setCategoryIds([]);
            }}
          >
            <option value="staff">Garçom</option>
            <option value="cashier">Caixa</option>
            <option value="panel">Painel (Kanban)</option>
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="field"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mín. 8)"
            className="field"
            required
            minLength={8}
          />
        </div>
        {role === "panel" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Categorias deste Kanban</p>
            <p className="text-sm text-ink-soft">
              Cozinha e bar são monitores separados: marque só o que esta tela deve receber.
            </p>
            <CategoryChecklist
              categories={categories}
              selected={categoryIds}
              onChange={setCategoryIds}
            />
          </div>
        ) : null}
        <button type="submit" className="btn-primary !py-2 text-sm">
          Cadastrar
        </button>
      </form>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      <ul className="space-y-2">
        {staff.length === 0 ? (
          <li className="text-sm text-ink-soft">Ninguém cadastrado ainda.</li>
        ) : (
          staff.map((row) => (
            <li key={row.id} className="surface space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-ink-soft">{row.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="field !w-auto !py-1.5 text-sm"
                    value={memberRoleValue(row.role)}
                    onChange={(e) => void changeRole(row, e.target.value as MemberRole)}
                  >
                    <option value="staff">Garçom</option>
                    <option value="cashier">Caixa</option>
                    <option value="panel">Painel (Kanban)</option>
                  </select>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.active ? "bg-sage-soft text-sage" : "bg-paper-2 text-ink-soft"
                    }`}
                  >
                    {row.active ? "Ativo" : "Inativo"} · {memberRoleLabel(row.role)}
                  </span>
                  <button type="button" onClick={() => void toggleActive(row)} className="btn-ghost text-sm">
                    {row.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row.id)}
                    className="btn-ghost text-sm text-chili"
                  >
                    Remover
                  </button>
                </div>
              </div>
              {memberRoleValue(row.role) === "panel" ? (
                <div className="border-t border-line/70 pt-3">
                  <p className="mb-2 text-sm font-medium">Categorias deste Kanban</p>
                  <CategoryChecklist
                    categories={categories}
                    selected={row.categoryIds ?? []}
                    onChange={(ids) => void changeCategories(row, ids)}
                  />
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
