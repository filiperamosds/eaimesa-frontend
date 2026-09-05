"use client";

import { ERROR_CODES } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { pickStr } from "./api-case";
import { clearStoredMesa, resolveMesaCode } from "./mesa-session-storage";
import type { PresenceSession } from "./types";

const CALL_POLL_MS = 3000;
const OPEN_CALL_MSG = "Garçom chamado — aguarde no salão.";

function openCallFrom(raw: unknown): PresenceSession["waiterCall"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickStr(o, "id");
  const status = pickStr(o, "status");
  const createdAt = pickStr(o, "createdAt", "created_at");
  if (!id || !createdAt) return null;
  if (status !== "open" && status !== "acked" && status !== "expired") return null;
  return { id, status, createdAt };
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
  const waiterCall = "waiterCall" in o || "waiter_call" in o
    ? openCallFrom(o.waiterCall ?? o.waiter_call)
    : undefined;
  return { tableLabel, expiresAt, expiresInSeconds: expiresIn, waiterCall };
}

function isOpenCall(presence: PresenceSession | null | undefined): boolean {
  return presence?.waiterCall?.status === "open";
}

/**
 * Presença no cardápio (ADR-026): menuCode no sessionStorage (bootstrap via QR ?mesa=) → POST presence.
 * Enquanto houver chamado `open`, poll em GET /presence até o salão marcar atendido (EAI-5).
 */
export function useWaiterPresence(slug: string, enabled: boolean) {
  const [presence, setPresence] = useState<PresenceSession | null | undefined>(null);
  const [mesaStored, setMesaStored] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callMsg, setCallMsg] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug) {
      setPresence(null);
      setMesaStored(false);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    const mesa = resolveMesaCode(slug);
    setMesaStored(Boolean(mesa));
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
            if (isOpenCall(data)) setCallMsg(OPEN_CALL_MSG);
          }
          return;
        }
        const raw = await api<unknown>("/v1/public/presence");
        const data = normalizePresence(raw);
        if (!cancelled) {
          setPresence(data);
          if (isOpenCall(data)) setCallMsg(OPEN_CALL_MSG);
        }
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
            clearStoredMesa(slug);
            setMesaStored(false);
            setPresence(null);
            setLoadError("Mesa não encontrada. Escaneie de novo o QR em Configurações → Mesas.");
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

  useEffect(() => {
    if (!enabled || !slug) return;
    const waiting = Boolean(callMsg) || isOpenCall(presence);
    if (!waiting) return;
    let cancelled = false;

    async function tick() {
      try {
        const raw = await api<unknown>("/v1/public/presence");
        const data = normalizePresence(raw);
        if (cancelled || !data) return;
        setPresence(data);
        if (!isOpenCall(data)) {
          setCallMsg(null);
        }
      } catch {
        // Presença temporariamente indisponível: tenta de novo no próximo tick.
      }
    }

    const id = window.setInterval(() => void tick(), CALL_POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, slug, callMsg, presence?.waiterCall?.status]);

  async function callWaiter() {
    setCallError(null);
    setCallMsg(null);
    setCalling(true);
    try {
      await api("/v1/public/waiter-calls", { method: "POST", body: JSON.stringify({}) });
      setCallMsg(OPEN_CALL_MSG);
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

  return { presence, mesaStored, loadError, calling, callMsg, callError, callWaiter };
}
