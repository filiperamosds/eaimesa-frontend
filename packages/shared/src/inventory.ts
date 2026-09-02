export const STOCK_UNITS = ["g", "ml", "un"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export function isStockUnit(value: string): value is StockUnit {
  return (STOCK_UNITS as readonly string[]).includes(value);
}

const STOCK_UNIT_LABEL: Record<StockUnit, string> = {
  g: "gramas",
  ml: "ml",
  un: "unidades",
};

export function stockUnitLabel(unit: string): string {
  return isStockUnit(unit) ? STOCK_UNIT_LABEL[unit] : unit;
}

/** 2000 g → "2 kg"; 1500 g → "1500 g"; 500 ml → "500 ml"; 1000 ml → "1 L". */
export function formatStockQty(qty: number, unit: string): string {
  if (unit === "g") {
    if (qty !== 0 && qty % 1000 === 0) return `${qty / 1000} kg`;
    return `${qty} g`;
  }
  if (unit === "ml") {
    if (qty !== 0 && qty % 1000 === 0) return `${qty / 1000} L`;
    return `${qty} ml`;
  }
  return `${qty} un`;
}

export type StockItem = {
  id: string;
  name: string;
  unit: StockUnit | string;
  quantity: number;
  alertQuantity: number | null;
  low: boolean;
  archivedAt?: string | null;
};

export type RecipeLine = {
  stockItemId: string;
  name?: string | null;
  unit?: string | null;
  qty: number;
};
