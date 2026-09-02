export const PRINT_GROUP_MAX = 12;
export const PRINT_GROUP_NAME_MAX = 40;
export const PRINT_GROUP_CATEGORIES_MAX = 40;

export type PrintGroup = {
  id: string;
  name: string;
  sortOrder: number;
  categoryIds: string[];
};

export type PrintGroupInput = {
  name: string;
  categoryIds: string[];
};

export type KitchenPrintJob<T> = {
  groupName: string | null;
  order: T;
};

/**
 * Parte o pedido em vias de térmica. Sem grupos, uma via. Categoria em dois
 * grupos gera duas vias. Itens que não caem em nenhum grupo vão para Outros
 * (ou ficam na via única se nenhum grupo bateu).
 */
export function kitchenTicketsForPrintGroups<
  T extends {
    items: { id: string; categoryId?: string | null }[];
  },
>(
  order: T,
  groups: readonly { name: string; categoryIds: readonly string[] }[] | null | undefined,
): KitchenPrintJob<T>[] {
  if (!groups || groups.length === 0) {
    return [{ groupName: null, order }];
  }

  const jobs: KitchenPrintJob<T>[] = [];
  const claimed = new Set<string>();

  for (const group of groups) {
    const allowed = new Set(group.categoryIds);
    const items = order.items.filter((item) => item.categoryId && allowed.has(item.categoryId));
    if (items.length === 0) continue;
    for (const item of items) claimed.add(item.id);
    jobs.push({ groupName: group.name, order: { ...order, items } });
  }

  const leftover = order.items.filter((item) => !claimed.has(item.id));
  if (leftover.length === 0) {
    return jobs.length > 0 ? jobs : [{ groupName: null, order }];
  }
  if (jobs.length === 0) {
    return [{ groupName: null, order }];
  }
  return [...jobs, { groupName: "Outros", order: { ...order, items: leftover } }];
}
