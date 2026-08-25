"use client";

import { ERROR_CODES, PLAN_BAR_MAX_TABLES, planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { pickStr } from "../lib/api-case";
import type { Venue, VenueTable } from "../lib/types";
import { MenuQrModal } from "./menu-qr-modal";

type TablesPayload = {
  tables: VenueTable[];
  maxActive: number;
  activeCount: number;
};

function normalizeTable(raw: VenueTable & Record<string, unknown>): VenueTable {
  const menuCode =
    pickStr(raw as Record<string, unknown>, "menuCode", "menu_code") ?? raw.menuCode ?? null;
  return { ...raw, menuCode };
}

function tablesErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === ERROR_CODES.PLAN_FEATURE) {
      return "O servidor ainda bloqueia mesas neste plano (PLAN_FEATURE). No Laravel, libere GET/POST /v1/owner/tables para kind=cardapio — ver docs/api/backend-waiter-call.md.";
    }
    return err.message;
  }
  return "Erro ao carregar.";
}

export function TablesEditor({ showVenueQr = false }: { showVenueQr?: boolean }) {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [maxActive, setMaxActive] = useState(PLAN_BAR_MAX_TABLES);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [qrTable, setQrTable] = useState<VenueTable | null>(null);
  const [venueQr, setVenueQr] = useState(false);

  async function load() {
    const [tablesData, venueData] = await Promise.all([
      api<TablesPayload>("/v1/owner/tables"),
      api<Venue>("/v1/owner/venue"),
    ]);
    setTables((tablesData.tables ?? []).map((t) => normalizeTable(t as VenueTable & Record<string, unknown>)));
    setMaxActive(tablesData.maxActive);
    setActiveCount(tablesData.activeCount);
    setVenue(venueData);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(tablesErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/owner/tables", { method: "POST", body: JSON.stringify({ label }) });
      setLabel("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === ERROR_CODES.PLAN_FEATURE
          ? tablesErrorMessage(err)
          : err instanceof ApiError
            ? err.message
            : "Não foi possível criar.",
      );
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando mesas…</p>;

  const service = venue ? planAllowsService(venue.planKind ?? venue.plan) : false;

  return (
    <div>
      <div className="surface mb-6 border-sage/20 bg-sage-soft/40 p-4 text-sm text-ink-soft">
        {service ? (
          <>
            <p className="font-medium text-ink">QR fixo = cardápio. QR do garçom = comanda.</p>
            <p className="mt-1">
              Exporte o QR de cada mesa (com <span className="font-mono">?mesa=</span>) para chamar
              garçom pelo cardápio, se ligado em{" "}
              <Link href="/painel/configuracoes/chamada" className="font-medium text-chili underline">
                Chamada
              </Link>
              . Comanda continua com o QR em <strong className="font-medium text-ink">/garcom</strong>.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink">Mesas do salão + QR por mesa</p>
            <p className="mt-1">
              O botão só aparece ao abrir o link com <span className="font-mono text-ink">?mesa=</span>
              . Sem <span className="font-mono">menuCode</span> no servidor, o QR não identifica a mesa.
              Ligue a feature em{" "}
              <Link href="/painel/configuracoes/chamada" className="font-medium text-chili underline">
                Chamada
              </Link>
              .
            </p>
          </>
        )}
      </div>
      {showVenueQr && venue ? (
        <section className="surface mb-6 p-5">
          <p className="eyebrow">QR do cardápio</p>
          <h2 className="mt-2 font-serif text-xl">Geral — porta ou Instagram</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Aponta para <span className="font-medium text-ink">/{venue.slug}</span> (sem mesa).
          </p>
          <button type="button" onClick={() => setVenueQr(true)} className="btn-secondary mt-4 !py-2 text-sm">
            Ver e exportar QR geral
          </button>
        </section>
      ) : null}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {activeCount}/{maxActive} mesas ativas
          {service ? ". Pedido de balcão e claim usam esta lista." : "."}
        </p>
        <Link
          href={service ? "/painel/pedidos" : "/painel/configuracoes/chamada"}
          className="text-sm font-medium text-chili"
        >
          {service ? "Ir para pedidos →" : "Configurar chamada →"}
        </Link>
      </div>
      <form onSubmit={(e) => void add(e)} className="mb-6 flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nova mesa (ex. Mesa 11)"
          className="field min-w-56 flex-1"
          required
          maxLength={40}
        />
        <button type="submit" className="btn-primary !py-2 text-sm">
          Adicionar
        </button>
      </form>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      {tables.length === 0 && !error ? (
        <p className="text-ink-soft">Nenhuma mesa ainda. Comece por Balcão e Mesa 1.</p>
      ) : null}
      {tables.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onChange={load}
              onError={setError}
              onQr={() => setQrTable(table)}
            />
          ))}
        </ul>
      ) : null}
      {qrTable && venue ? (
        <MenuQrModal
          slug={venue.slug}
          venueName={venue.name}
          tableLabel={qrTable.label}
          mesaCode={qrTable.menuCode}
          servicePlan={service}
          onClose={() => setQrTable(null)}
        />
      ) : null}
      {venueQr && venue ? (
        <MenuQrModal
          slug={venue.slug}
          venueName={venue.name}
          servicePlan={service}
          onClose={() => setVenueQr(false)}
        />
      ) : null}
    </div>
  );
}

function TableCard({
  table,
  onChange,
  onError,
  onQr,
}: {
  table: VenueTable;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
  onQr: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.label);

  async function save() {
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: name }),
      });
      setEditing(false);
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar.");
    }
  }

  async function toggle() {
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !table.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar.");
    }
  }

  async function remove() {
    if (!confirm("Remover esta mesa? Pedidos antigos guardam o nome.")) return;
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <li className={`surface p-4 ${table.active ? "" : "opacity-60"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`grid h-12 w-12 place-items-center rounded-full border-2 ${
            table.active ? "border-chili/40 bg-chili/10 text-chili" : "border-line bg-paper-2 text-ink-soft"
          } font-serif text-sm`}
          aria-hidden
        >
          ⌂
        </span>
        <span className={`text-[11px] uppercase tracking-wider ${table.active ? "text-sage" : "text-ink-soft"}`}>
          {table.active ? "ativa" : "oculta"}
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={40} />
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => void save()} className="font-medium text-sage">
              Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-ink-soft">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="font-serif text-xl">{table.label}</p>
      )}
      {table.menuCode ? (
        <p className="mt-1 font-mono text-[11px] text-ink-soft">mesa={table.menuCode}</p>
      ) : (
        <p className="mt-1 text-[11px] text-chili">
          Sem menuCode — QR sem ?mesa= (chamar garçom não funciona até o Laravel gerar o código).
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={onQr} className="font-medium text-chili hover:text-chili-dark">
          QR cardápio
        </button>
        <button type="button" onClick={() => setEditing(true)} className="text-ink-soft hover:text-ink">
          Renomear
        </button>
        <button type="button" onClick={() => void toggle()} className="text-ink-soft hover:text-ink">
          {table.active ? "Ocultar" : "Ativar"}
        </button>
        <button type="button" onClick={() => void remove()} className="text-chili">
          Excluir
        </button>
      </div>
    </li>
  );
}
