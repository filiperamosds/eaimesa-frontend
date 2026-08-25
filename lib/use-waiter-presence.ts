"use client";

import { ERROR_CODES } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { PresenceSession } from "./types";

function readMesaFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("mesa");
  const code = raw?.trim();
  return code || null;
}

/**
 * Presença no cardápio (ADR-026): `?mesa=` → POST presence; cookie → GET presence.
 * Só exibe “Chamar garçom” quando a API confirma sessão válida (feature ligada no servidor).
 */
export function useWaiterPresence(slug: string, enabled: boolean) {
  const [presence, setPresence] = useState<PresenceSession | null | undefined>(null);
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callMsg, setCallMsg] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug) {
      setPresence(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    const mesa = readMesaFromUrl();
    // Com ?mesa= mostra “Identificando…”; sem query, tenta cookie em silêncio.
    if (mesa) {
      setPresence(undefined);
      setBusy(true);
    }

    async function load() {
      try {
        if (mesa) {
          const data = await api<PresenceSession>(
            `/v1/public/venues/${encodeURIComponent(slug)}/presence`,
            { method: "POST", body: JSON.stringify({ mesa }) },
          );
          if (!cancelled) setPresence(data);
          return;
        }
        const data = await api<PresenceSession>("/v1/public/presence");
        if (!cancelled) setPresence(data);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof ApiError &&
          (err.code === ERROR_CODES.FEATURE_DISABLED ||
            err.code === ERROR_CODES.TABLE_NOT_FOUND ||
            err.code === ERROR_CODES.SESSION_REQUIRED ||
            err.status === 401 ||
            err.status === 403 ||
            err.status === 404)
        ) {
          setPresence(null);
          return;
        }
        setPresence(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  async function callWaiter() {
    setCallError(null);
    setCallMsg(null);
    setCalling(true);
    try {
      await api("/v1/public/waiter-calls", { method: "POST", body: JSON.stringify({}) });
      setCallMsg("Garçom chamado — aguarde no salão.");
    } catch (err) {
      if (err instanceof ApiError && err.code === ERROR_CODES.CALL_ALREADY_OPEN) {
        setCallMsg("Já avisamos o salão — aguarde um instante.");
        return;
      }
      setCallError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível chamar. Escaneie o QR da mesa de novo.",
      );
    } finally {
      setCalling(false);
    }
  }

  return { presence, busy, calling, callMsg, callError, callWaiter };
}
