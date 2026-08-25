/** CPF (11) ou CNPJ (14) — só dígitos, sem persistir no front além do POST. */
export function normalizeCpfCnpj(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 14);
}

export function isCpfOrCnpj(raw: string): boolean {
  const d = normalizeCpfCnpj(raw);
  return d.length === 11 || d.length === 14;
}

export function normalizeCep(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

export function isCep(raw: string): boolean {
  return normalizeCep(raw).length === 8;
}

/** Máscara `00000-000`. */
export function formatCepInput(raw: string): string {
  const d = normalizeCep(raw);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
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

/** Responsável do estabelecimento (pagador Asaas / ADR-025). */
export type VenueRepresentative = {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  postalCode: string;
  addressNumber: string;
};

/** Pronto para checkout Asaas (cartão exige tel, CEP e número). */
export function isRepresentativeComplete(
  rep: Partial<VenueRepresentative> | null | undefined,
): rep is VenueRepresentative {
  if (!rep) return false;
  const name = (rep.name ?? "").trim();
  const cpf = normalizeCpfCnpj(rep.cpfCnpj ?? "");
  const email = (rep.email ?? "").trim();
  const phone = (rep.phone ?? "").replace(/\D/g, "");
  const cep = normalizeCep(rep.postalCode ?? "");
  const number = (rep.addressNumber ?? "").trim();
  return (
    name.length >= 3 &&
    isCpfOrCnpj(cpf) &&
    email.includes("@") &&
    phone.length >= 10 &&
    phone.length <= 11 &&
    isCep(cep) &&
    number.length >= 1 &&
    number.length <= 20
  );
}

export function representativeFingerprint(rep: Partial<VenueRepresentative> | null | undefined): string {
  if (!rep) return "";
  return [
    (rep.name ?? "").trim().toLowerCase(),
    normalizeCpfCnpj(rep.cpfCnpj ?? ""),
    (rep.email ?? "").trim().toLowerCase(),
    (rep.phone ?? "").replace(/\D/g, ""),
    normalizeCep(rep.postalCode ?? ""),
    (rep.addressNumber ?? "").trim(),
  ].join("|");
}

