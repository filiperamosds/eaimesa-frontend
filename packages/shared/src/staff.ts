export const PLAN_BAR_MAX_STAFF = 5;

export const MEMBER_ROLES = ["staff", "cashier", "panel"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export function isMemberRole(value: string): value is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(value);
}

export function memberRoleLabel(role: string | null | undefined): string {
  if (role === "cashier") return "Caixa";
  if (role === "panel") return "Painel";
  return "Garçom";
}

export function isPanelMember(session: {
  role?: string | null;
  member?: { role?: string | null } | null;
}): boolean {
  return session.role === "staff" && session.member?.role === "panel";
}

/** Dono e caixa sempre; garçom só se o bar permitir. Painel (KDS) nunca encerra. Campo ausente = true (legado). */
export function sessionCanCloseTabs(session: {
  role: string;
  member?: { role?: string | null } | null;
  venue: { staffCanCloseTabs?: boolean | null };
}): boolean {
  if (session.role === "owner") return true;
  if (session.member?.role === "panel") return false;
  if (session.member?.role === "cashier") return true;
  return session.venue.staffCanCloseTabs !== false;
}

/** Kanban da estação: só itens das categorias do membro. Sem snapshot, devolve o pedido inteiro (API legado). */
export function filterOrdersByCategories<
  T extends {
    items: { categoryId?: string | null; unitPriceCents: number; qty: number }[];
    totalCents: number;
  },
>(orders: T[], categoryIds: readonly string[] | null | undefined): T[] {
  if (!categoryIds) return orders;
  if (categoryIds.length === 0) return [];
  const allowed = new Set(categoryIds);
  const out: T[] = [];
  for (const order of orders) {
    const hasSnapshot = order.items.some((item) => item.categoryId);
    if (!hasSnapshot) {
      out.push(order);
      continue;
    }
    const items = order.items.filter((item) => item.categoryId && allowed.has(item.categoryId));
    if (items.length === 0) continue;
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0);
    out.push({ ...order, items, totalCents });
  }
  return out;
}
