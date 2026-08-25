"use client";

import type { PresenceSession } from "../lib/types";

export function GuestWaiterCallBar({
  presence,
  mesaStored,
  loadError,
  featureHint,
  calling,
  callMsg,
  callError,
  onCall,
}: {
  presence: PresenceSession | null | undefined;
  mesaStored?: boolean;
  loadError: string | null;
  featureHint?: boolean;
  calling: boolean;
  callMsg: string | null;
  callError: string | null;
  onCall: () => void;
}) {
  if (presence === undefined) {
    return (
      <div className="border-b border-line/80 bg-card/90 px-5 py-3 text-center text-sm text-ink-soft">
        Identificando mesa…
      </div>
    );
  }

  if (presence) {
    return (
      <div className="border-b border-chili/25 bg-chili/5 px-4 py-3">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-ink">
            Você está na <span className="font-medium">{presence.tableLabel}</span>
          </p>
          <button
            type="button"
            disabled={calling || Boolean(callMsg)}
            onClick={onCall}
            className="btn-primary shrink-0 !py-2 !text-sm"
          >
            {calling ? "Chamando…" : callMsg ? "Chamado" : "Chamar garçom"}
          </button>
        </div>
        {callMsg ? <p className="mx-auto mt-2 max-w-lg text-center text-sm text-sage">{callMsg}</p> : null}
        {callError ? (
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-chili">{callError}</p>
        ) : null}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="border-b border-chili/30 bg-chili/5 px-5 py-3 text-center text-sm text-chili">
        {loadError}
      </div>
    );
  }

  if (featureHint && !mesaStored) {
    return (
      <div className="border-b border-line/80 bg-card/90 px-5 py-3 text-center text-sm text-ink-soft">
        Escaneie o <span className="font-medium text-ink">QR da mesa</span> no salão para chamar o garçom.
        O link compartilhado não leva o código da mesa.
      </div>
    );
  }

  return null;
}
