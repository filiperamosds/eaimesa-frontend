// Fatia 16 (ADR-029): módulos por plano. O backend resolve os módulos efetivos
// do venue; o front usa o registro abaixo só para rótulos/agrupamento e o helper
// `venueHasModule` para esconder superfícies.

export const MODULE_KEYS = [
  "menu",
  "tables",
  "waiter_call",
  "orders_kanban",
  "guest_ordering",
  "staff",
  "tabs_closing",
  "finance",
  "service_fee",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleType = "use" | "config";
export type ModuleGroup = "visual" | "operacao" | "config";

export type ModuleMeta = {
  key: ModuleKey;
  label: string;
  type: ModuleType;
  group: ModuleGroup;
};

/** Metadados de exibição dos módulos-semente (o catálogo real vem do `/admin`). */
export const MODULES: Record<ModuleKey, ModuleMeta> = {
  menu: { key: "menu", label: "Cardápio", type: "use", group: "visual" },
  tables: { key: "tables", label: "Mesas", type: "use", group: "operacao" },
  waiter_call: { key: "waiter_call", label: "Chamar garçom", type: "use", group: "operacao" },
  orders_kanban: { key: "orders_kanban", label: "Pedidos (Kanban)", type: "use", group: "visual" },
  guest_ordering: { key: "guest_ordering", label: "Pedido do cliente", type: "use", group: "operacao" },
  staff: { key: "staff", label: "Equipe", type: "use", group: "operacao" },
  tabs_closing: { key: "tabs_closing", label: "Encerramento de comanda", type: "config", group: "config" },
  finance: { key: "finance", label: "Financeiro", type: "use", group: "operacao" },
  service_fee: { key: "service_fee", label: "Taxa de serviço", type: "config", group: "config" },
};

export const MODULE_GROUP_LABEL: Record<ModuleGroup, string> = {
  visual: "Visual",
  operacao: "Operação",
  config: "Configuração",
};

export type VenueModuleState = {
  enabled: boolean;
  config?: Record<string, unknown>;
};

/** Mapa de módulos efetivos serializado em `GET /v1/owner/venue`/`billing/plans`. */
export type VenueModules = Partial<Record<string, VenueModuleState>>;

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function moduleLabel(key: string): string {
  return isModuleKey(key) ? MODULES[key].label : key;
}

/**
 * `true` se o venue tem o módulo no plano E ligado.
 * Quando `modules` não veio no payload (compat), retorna `fallback`.
 */
export function venueHasModule(
  venue: { modules?: VenueModules | null } | null | undefined,
  key: ModuleKey,
  fallback = false,
): boolean {
  const mods = venue?.modules;
  if (!mods) return fallback;
  return mods[key]?.enabled === true;
}

/** Config `finance.requireOpenCash`: bloquear pedido/QR sem caixa aberto. */
export function venueRequiresOpenCash(
  venue: { modules?: VenueModules | null } | null | undefined,
): boolean {
  return venue?.modules?.finance?.config?.requireOpenCash === true;
}
