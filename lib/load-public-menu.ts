import { isReservedSlug, planAllowsService } from "@eaimesa/shared";
import { notFound, redirect } from "next/navigation";
import { apiBase } from "./api";
import { pickBool } from "./api-case";
import type { PublicMenu } from "./types";

function normalizePublicMenu(raw: PublicMenu): PublicMenu {
  const v = raw.venue as PublicMenu["venue"] & Record<string, unknown>;
  const waiterCallEnabled = pickBool(v, "waiterCallEnabled", "waiter_call_enabled");
  const ttl = v.waiterCallTtlMinutes ?? v.waiter_call_ttl_minutes;
  return {
    ...raw,
    venue: {
      ...raw.venue,
      waiterCallEnabled: waiterCallEnabled ?? raw.venue.waiterCallEnabled,
      waiterCallTtlMinutes:
        typeof ttl === "number" ? ttl : raw.venue.waiterCallTtlMinutes,
    },
  };
}

export async function loadPublicMenu(slug: string): Promise<PublicMenu | null> {
  const res = await fetch(`${apiBase()}/v1/public/venues/${encodeURIComponent(slug)}`, {
    next: { revalidate: 15 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("menu_unavailable");
  const data = (await res.json()) as PublicMenu;
  return normalizePublicMenu(data);
}

export function venueAllowsGuestOrdering(menu: PublicMenu): boolean {
  if (!planAllowsService(menu.venue.planKind ?? menu.venue.plan ?? "")) return false;
  return Boolean(menu.venue.acceptsOrders);
}

/** PIN, claim e comanda só no Auto atendimento. Plano Cardápio volta para `/{slug}`. */
export async function requireGuestOrdering(slug: string): Promise<PublicMenu> {
  if (isReservedSlug(slug)) notFound();
  const menu = await loadPublicMenu(slug).catch(() => null);
  if (!menu) notFound();
  if (!venueAllowsGuestOrdering(menu)) redirect(`/${slug}`);
  return menu;
}
