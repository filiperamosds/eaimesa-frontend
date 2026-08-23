import { planAllowsService } from "@eaimesa/shared";
import type { Session } from "./types";

/** Query `next` só se for path interno (evita open redirect). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) return null;
  if (next.startsWith("/login") || next.startsWith("/cadastro") || next.startsWith("/admin/login")) {
    return null;
  }
  return next;
}

export function homeForSession(session: Pick<Session, "role" | "venue">): string {
  if (session.role === "staff") return "/garcom";
  return planAllowsService(session.venue.planKind ?? session.venue.plan)
    ? "/painel/pedidos"
    : "/painel/cardapio";
}

export function resolveOwnerLoginTarget(
  session: Pick<Session, "role" | "venue"> & { redirectPath?: string },
  next?: string | null,
): string {
  const fallback = session.redirectPath || homeForSession(session);
  const target = safeNextPath(next) ?? fallback;
  if (session.role === "staff" && (target.startsWith("/painel") || target.startsWith("/admin"))) {
    return "/garcom";
  }
  if (session.role === "owner" && target.startsWith("/admin")) {
    return fallback;
  }
  return target;
}
