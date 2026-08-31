"use client";

import { memberRoleLabel, PLAN_BAR_MAX_STAFF, type MemberRole } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, StaffMember } from "../lib/types";
import { CategoryChecklist } from "./category-checklist";

type StaffPayload = {
  staff: StaffMember[];
  maxActive: number;
  activeCount: number;
};

function memberRoleValue(role: StaffMember["role"]): MemberRole {
  return role === "cashier" || role === "panel" ? role : "staff";
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
  const [role, setRole] = useState<MemberRole>("staff");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [printViaGroups, setPrintViaGroups] = useState(false);

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
          role,
          categoryIds: role === "panel" ? categoryIds : undefined,
          printViaGroups: role === "panel" ? printViaGroups : undefined,
        }),
      });
      setName("");
      setEmail("");
      setRole("staff");
      setCategoryIds([]);
      setPrintViaGroups(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    }
  }

  async function resendInvite(row: StaffMember) {
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}/resend-invite`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reenviar o convite.");
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

  async function changePrintViaGroups(row: StaffMember, next: boolean) {
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ printViaGroups: next }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a impressão.");
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
        <p className="font-medium text-ink">A equipe entra pelo mesmo login do painel.</p>
        <p className="mt-1">
          Informe nome, e-mail e perfil. Enviamos um link para a pessoa criar a senha. Garçom e
          caixa vão para a tela da equipe. Painel abre a fila da cozinha ou do bar, só com as
          categorias escolhidas. Máximo {maxActive} ativos no plano Auto atendimento.
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
              if (next !== "panel") {
                setCategoryIds([]);
                setPrintViaGroups(false);
              }
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
              emptyHint="Cadastre categorias no cardápio para escolher o que chega neste Kanban."
            />
            <label className="flex cursor-pointer items-start gap-2 pt-1 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-chili"
                checked={printViaGroups}
                onChange={(e) => setPrintViaGroups(e.target.checked)}
              />
              <span>
                <span className="font-medium">Imprimir via grupos</span>
                <span className="mt-0.5 block text-ink-soft">
                  Usa os grupos de impressão do estabelecimento (via + corte). Sem isso, imprime
                  só os itens deste Kanban numa via só.
                </span>
              </span>
            </label>
          </div>
        ) : null}
        <button type="submit" className="btn-primary !py-2 text-sm">
          Enviar convite
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
                  {row.invitePending ? (
                    <p className="mt-1 text-xs text-amber">Aguardando criar senha pelo e-mail</p>
                  ) : null}
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
                  {row.invitePending ? (
                    <button
                      type="button"
                      onClick={() => void resendInvite(row)}
                      className="btn-ghost text-sm"
                    >
                      Reenviar convite
                    </button>
                  ) : null}
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
                    emptyHint="Cadastre categorias no cardápio para escolher o que chega neste Kanban."
                  />
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-chili"
                      checked={row.printViaGroups === true}
                      onChange={() => void changePrintViaGroups(row, !(row.printViaGroups === true))}
                    />
                    <span>
                      <span className="font-medium">Imprimir via grupos</span>
                      <span className="mt-0.5 block text-ink-soft">
                        A térmica aplica os grupos do estabelecimento sobre os itens desta estação.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
