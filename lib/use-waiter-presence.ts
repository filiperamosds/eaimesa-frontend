"use client";

import { ERROR_CODES } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { pickStr } from "./api-case";
import type { PresenceSession } from "./types";

function readMesaFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("mesa");
  const code = raw?.trim();
  return code || null;
}

function normalizePresence(data: unknown): PresenceSession | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const tableLabel = pickStr(o, "tableLabel", "table_label");
  if (!tableLabel) return null;
  const expiresAt = pickStr(o, "expiresAt", "expires_at") ?? new Date().toISOString();
  const expiresIn =
    typeof o.expiresInSeconds === "number"
      ? o.expiresInSeconds
      : typeof o.expires_in_seconds === "number"
        ? o.expires_in_seconds
        : undefined;
  return { tableLabel, expiresAt, expiresInSeconds: expiresIn };
}

/**
 * Presença no cardápio (ADR-026): `?mesa=` → POST presence; cookie → GET presence.
 * Só exibe “Chamar garçom” quando a API confirma sessão válida.
 */
export function useWaiterPresence(slug: string, enabled: boolean) {
  const [presence, setPresence] = useState<PresenceSession | null | undefined>(null);
  const [mesaParam, setMesaParam] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callMsg, setCallMsg] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug) {
      setPresence(null);
      setMesaParam(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    const mesa = readMesaFromUrl();
    setMesaParam(mesa);
    setLoadError(null);
    if (mesa) setPresence(undefined);

    async function load() {
      try {
        if (mesa) {
          const raw = await api<unknown>(
            `/v1/public/venues/${encodeURIComponent(slug)}/presence`,
            { method: "POST", body: JSON.stringify({ mesa }) },
          );
          const data = normalizePresence(raw);
          if (!cancelled) {
            if (!data) {
              setPresence(null);
              setLoadError("Resposta de presença inválida. Confira o contrato no Laravel.");
              return;
            }
            setPresence(data);
          }
          return;
        }
        const raw = await api<unknown>("/v1/public/presence");
        const data = normalizePresence(raw);
        if (!cancelled) setPresence(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === ERROR_CODES.FEATURE_DISABLED) {
            setPresence(null);
            setLoadError(
              mesa
                ? "Chamar garçom está desligado no servidor (FEATURE_DISABLED). Salve de novo em Configurações → Chamada."
                : null,
            );
            return;
          }
          if (err.code === ERROR_CODES.TABLE_NOT_FOUND) {
            setPresence(null);
            setLoadError("Mesa não encontrada. Exporte de novo o QR em Configurações → Mesas.");
            return;
          }
          if (
            err.code === ERROR_CODES.SESSION_REQUIRED ||
            err.status === 401 ||
            (!mesa && (err.status === 403 || err.status === 404))
          ) {
            setPresence(null);
            setLoadError(null);
            return;
          }
          if (err.status === 404) {
            setPresence(null);
            setLoadError(
              "API de presença ainda não está no Laravel (404). Veja docs/api/backend-waiter-call.md.",
            );
            return;
          }
          setPresence(null);
          setLoadError(err.message);
          return;
        }
        setPresence(null);
        setLoadError("Falha ao identificar a mesa.");
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

  return { presence, mesaParam, loadError, calling, callMsg, callError, callWaiter };
}
