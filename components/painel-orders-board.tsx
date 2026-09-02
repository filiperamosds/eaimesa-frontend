"use client";

import { isPanelMember, venueHasModule } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { OrdersBoard, STAFF_BOARD_ENDPOINTS } from "./orders-board";
import { StockAlertBanner } from "./stock-alert-banner";

export function PainelOrdersBoard() {
  const [me, setMe] = useState<Session | null>(null);

  useEffect(() => {
    void api<Session>("/v1/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (!me) {
    return <p className="text-ink-soft">Carregando pedidos…</p>;
  }

  const panel = isPanelMember(me);
  return (
    <div>
      {!panel && venueHasModule(me.venue, "inventory") ? <StockAlertBanner /> : null}
      <OrdersBoard
        endpoints={panel ? STAFF_BOARD_ENDPOINTS : undefined}
        station={panel}
        categoryIds={panel ? me.member?.categoryIds : undefined}
      />
    </div>
  );
}
