import { isPanelMember, planAllowsService } from "@eaimesa/shared";
import type { Session } from "./types";

/** Query `next` só se for path interno (evita open redirect). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) return null;
  if (next.startsWith("/login") || next.startsWith("/cadastro") || next.startsWith("/admin/login")) {
    return null;
  }
  return next;
}

export function homeForSession(session: Pick<Session, "role" | "venue" | "member">): string {
  if (isPanelMember(session)) return "/painel/pedidos";
  if (session.role === "staff") return "/garcom";
  return planAllowsService(session.venue.planKind ?? session.venue.plan)
    ? "/painel/pedidos"
    : "/painel/configuracoes/cardapio";
}

export function resolveOwnerLoginTarget(
  session: Pick<Session, "role" | "venue" | "member"> & { redirectPath?: string },
  next?: string | null,
): string {
  const fallback = session.redirectPath || homeForSession(session);
  const target = safeNextPath(next) ?? fallback;
  if (isPanelMember(session)) {
    if (target.startsWith("/painel/pedidos")) return target;
    return "/painel/pedidos";
  }
  if (session.role === "staff" && (target.startsWith("/painel") || target.startsWith("/admin"))) {
    return "/garcom";
  }
  if (session.role === "owner" && target.startsWith("/admin")) {
    return fallback;
  }
  return target;
}
