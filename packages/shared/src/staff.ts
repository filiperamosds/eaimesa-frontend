export const PLAN_BAR_MAX_STAFF = 5;

export const MEMBER_ROLES = ["staff", "cashier"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export function isMemberRole(value: string): value is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(value);
}

export function memberRoleLabel(role: string | null | undefined): string {
  return role === "cashier" ? "Caixa" : "Garçom";
}

/** Dono e caixa sempre; garçom só se o bar permitir. Campo ausente = true (legado). */
export function sessionCanCloseTabs(session: {
  role: string;
  member?: { role?: string | null } | null;
  venue: { staffCanCloseTabs?: boolean | null };
}): boolean {
  if (session.role === "owner") return true;
  if (session.member?.role === "cashier") return true;
  return session.venue.staffCanCloseTabs !== false;
}
