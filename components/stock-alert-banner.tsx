"use client";

import { formatStockQty, venueHasModule } from "@eaimesa/shared";
import type { StockItem } from "@eaimesa/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Session } from "../lib/types";

export function StockAlertBanner() {
  const [items, setItems] = useState<StockItem[] | null>(null);

  const load = useCallback(() => {
    void api<Session>("/v1/auth/me")
      .then((me) => {
        if (!venueHasModule(me.venue, "inventory")) {
          setItems([]);
          return;
        }
        return api<{ items: StockItem[] }>("/v1/owner/stock/alerts").then((d) => setItems(d.items));
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-chili/25 bg-chili/5 px-4 py-3 text-sm">
      <p className="font-medium text-chili">Estoque baixo</p>
      <p className="mt-1 text-ink-soft">
        {items
          .slice(0, 4)
          .map((i) => `${i.name} (${formatStockQty(i.quantity, i.unit)})`)
          .join(" · ")}
        {items.length > 4 ? ` · +${items.length - 4}` : ""}
        .{" "}
        <Link href="/painel/estoque" className="font-medium text-chili underline">
          Ver estoque
        </Link>
      </p>
    </div>
  );
}
