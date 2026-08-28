export const ORDER_STATUSES = ["pending", "accepted", "preparing", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const KANBAN_COLUMNS = ["pending", "preparing", "delivered", "cancelled"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Novos",
  accepted: "Aceitos",
  preparing: "Preparando",
  delivered: "Entregues",
  cancelled: "Cancelados",
};

/** Coluna do board. `accepted` legado cai em Preparando. */
export function kanbanColumnFor(status: OrderStatus): KanbanColumn | null {
  if (status === "accepted") return "preparing";
  if ((KANBAN_COLUMNS as readonly string[]).includes(status)) return status as KanbanColumn;
  return null;
}

export const ORDER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  accepted: "preparing",
  preparing: "delivered",
};

export const ORDER_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Preparar",
  accepted: "Preparar",
  preparing: "Entregar",
};

/** Status na comanda do cliente (não usa os rótulos da cozinha). */
export const GUEST_ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Na fila",
  accepted: "Aceito",
  preparing: "Preparando",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function tabPartialCents(orders: { status: string; totalCents: number }[]): number {
  return orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.totalCents, 0);
}

/** Mesma regra do Laravel: round(subtotal * percent / 100) se a taxa estiver ligada. */
export function serviceFeeCents(subtotalCents: number, percent: number): number {
  if (percent <= 0 || subtotalCents <= 0) return 0;
  return Math.round((subtotalCents * percent) / 100);
}

export function tabDueCents(subtotalCents: number, percent: number): number {
  return subtotalCents + serviceFeeCents(subtotalCents, percent);
}
