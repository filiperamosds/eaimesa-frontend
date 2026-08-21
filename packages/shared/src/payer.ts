/** CPF (11) ou CNPJ (14) — só dígitos, sem persistir no front além do POST. */
export function normalizeCpfCnpj(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 14);
}

export function isCpfOrCnpj(raw: string): boolean {
  const d = normalizeCpfCnpj(raw);
  return d.length === 11 || d.length === 14;
}

/** Máscara de digitação: `000.000.000-00` ou `00.000.000/0000-00`. */
export function formatCpfCnpjInput(raw: string): string {
  const d = normalizeCpfCnpj(raw);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  const a = d.slice(0, 2);
  const b = d.slice(2, 5);
  const c = d.slice(5, 8);
  const e = d.slice(8, 12);
  const f = d.slice(12);
  if (d.length <= 2) return a;
  if (d.length <= 5) return `${a}.${b}`;
  if (d.length <= 8) return `${a}.${b}.${c}`;
  if (d.length <= 12) return `${a}.${b}.${c}/${e}`;
  return `${a}.${b}.${c}/${e}-${f}`;
}
