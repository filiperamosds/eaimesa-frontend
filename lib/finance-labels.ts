export const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  courtesy: "Cortesia",
  other: "Outro",
};

export const SOURCE_LABEL: Record<string, string> = {
  guest: "Cliente (QR)",
  counter: "Garçom",
};

export function planFeatureMessage(code: string | undefined, fallback: string): string {
  return code === "PLAN_FEATURE" ? "O módulo Financeiro não está no seu plano." : fallback;
}
