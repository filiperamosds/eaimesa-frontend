"use client";

import type { GuestOrder } from "../lib/types";
import { GuestPartial } from "./guest-partial";

export function GuestPartialDialog({
  guestName,
  tableLabel,
  orders,
  totalCents,
  error,
  onClose,
}: {
  guestName: string;
  tableLabel: string;
  orders: GuestOrder[];
  totalCents: number;
  error?: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-partial-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="eyebrow">Parcial</p>
        <h2 id="guest-partial-title" className="mt-2 font-serif text-2xl">
          {guestName}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{tableLabel}</p>
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <GuestPartial orders={orders} totalCents={totalCents} />
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn-primary !py-2 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
