"use client";

import {
  ERROR_CODES,
  INTEGRATION_EVENT_INTEGRATIONS,
  INTEGRATION_EVENT_LIMIT_DEFAULT,
  INTEGRATION_EVENT_LIMIT_OPTIONS,
  INTEGRATION_EVENT_Q_MAX,
  INTEGRATION_EVENT_STATUSES,
  integrationEventDetailSchema,
  integrationEventListSchema,
  type IntegrationEventDetail,
  type IntegrationEventListItem,
  type IntegrationEventStatus,
} from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";

const STATUS_LABEL: Record<IntegrationEventStatus, string> = {
  received: "Recebido",
  processed: "Processado",
  ignored: "Ignorado",
  failed: "Falhou",
};

function formatCreatedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusClass(status: IntegrationEventStatus): string {
  if (status === "processed") return "text-sage-soft";
  if (status === "failed") return "text-chili";
  if (status === "received") return "text-amber";
  return "text-white/45";
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return String(value);
  }
}

function EventDetailDrawer({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<IntegrationEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const data = integrationEventDetailSchema.parse(
          await api(`/v1/platform/integration-events/${encodeURIComponent(eventId)}`),
        );
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setError(
            err.code === ERROR_CODES.NOT_FOUND
              ? err.message
              : "Evento de integração não encontrado.",
          );
          return;
        }
        setError(err instanceof ApiError ? err.message : "Falha ao carregar o evento.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

  const jsonForCopy = prettyJson({
    payload: detail?.payload ?? null,
    meta: {
      ip: detail?.meta?.ip ?? null,
      headers: detail?.meta?.headers ?? {},
    },
  });

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonForCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#1a1614] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Webhook</p>
            <h2 id={titleId} className="mt-2 truncate font-serif text-2xl">
              {detail?.event ?? "Evento"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-ghost shrink-0 text-white/80"
          >
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading ? <p className="text-sm text-white/45">Carregando…</p> : null}
          {error ? <p className="text-sm text-chili">{error}</p> : null}

          {detail ? (
            <div className="space-y-4">
              <p className="text-sm text-white/55">
                {formatCreatedAt(detail.createdAt)}
                {detail.meta?.ip ? ` · ${detail.meta.ip}` : ""}
              </p>
              {detail.errorMessage ? (
                <p className="rounded-2xl border border-chili/40 bg-chili/10 px-3 py-2 text-sm text-chili">
                  {detail.errorMessage}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white/60">payload + meta.headers</p>
                <button
                  type="button"
                  onClick={() => void copyJson()}
                  className="btn-secondary !bg-white/10 !py-2 !text-white text-sm"
                >
                  {copied ? "Copiado" : "Copiar JSON"}
                </button>
              </div>
              <pre className="overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/80">
                {jsonForCopy}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminIntegrationEvents() {
  const router = useRouter();
  const [integration, setIntegration] = useState("");
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState<number>(INTEGRATION_EVENT_LIMIT_DEFAULT);
  const [rows, setRows] = useState<IntegrationEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastRowRef = useRef<HTMLElement | null>(null);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/admin/login");
      return;
    }
    setError(err instanceof ApiError ? err.message : "Falha ao carregar os eventos.");
  }

  async function load(
    next = { integration, event, status, q, limit },
  ) {
    const params = new URLSearchParams();
    if (next.integration) params.set("integration", next.integration);
    const eventName = next.event.trim();
    if (eventName) params.set("event", eventName);
    if (next.status) params.set("status", next.status);
    const query = next.q.trim().slice(0, INTEGRATION_EVENT_Q_MAX);
    if (query) params.set("q", query);
    params.set("limit", String(next.limit));
    const data = integrationEventListSchema.parse(
      await api(`/v1/platform/integration-events?${params.toString()}`),
    );
    setRows(data.events);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  function openDetail(id: string, el: HTMLElement) {
    lastRowRef.current = el;
    setSelectedId(id);
  }

  function closeDetail() {
    setSelectedId(null);
    lastRowRef.current?.focus();
  }

  const filtersActive = Boolean(integration || status || event.trim() || q.trim());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Operação</p>
        <h1 className="mt-2 font-serif text-3xl">Integrações</h1>
        <p className="mt-2 text-sm text-white/55">
          Webhooks recebidos (Asaas). Sem reprocessar, apagar ou stream.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void refresh();
        }}
      >
        <label className="block text-sm sm:w-36">
          <span className="mb-1 block text-white/60">Integração</span>
          <select
            className="field-night"
            value={integration}
            onChange={(e) => setIntegration(e.target.value)}
          >
            <option value="">Todos</option>
            {INTEGRATION_EVENT_INTEGRATIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:w-40">
          <span className="mb-1 block text-white/60">Status</span>
          <select className="field-night" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {INTEGRATION_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:w-48">
          <span className="mb-1 block text-white/60">Evento</span>
          <input
            className="field-night"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="PAYMENT_RECEIVED"
            autoComplete="off"
            maxLength={128}
          />
        </label>
        <label className="block min-w-0 flex-1 text-sm">
          <span className="mb-1 block text-white/60">Busca</span>
          <input
            className="field-night"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Evento ou ID externo"
            autoComplete="off"
            maxLength={INTEGRATION_EVENT_Q_MAX}
          />
        </label>
        <label className="block text-sm sm:w-24">
          <span className="mb-1 block text-white/60">Limite</span>
          <select
            className="field-night"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {INTEGRATION_EVENT_LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading} className="btn-secondary !bg-white/10 !text-white">
          Atualizar
        </button>
      </form>

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      {loading && rows.length === 0 ? (
        <p className="text-sm text-white/45">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/45">
          {filtersActive ? "Nenhum evento com esse filtro." : "Nenhum evento ainda"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Integração</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">ID externo</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver evento ${row.event ?? row.id}`}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/10 focus:outline-none"
                  onClick={(e) => openDetail(row.id, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(row.id, e.currentTarget);
                    }
                  }}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-white/70">
                    {formatCreatedAt(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-white/70">
                      {row.integration}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/85">{row.event ?? "—"}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-white/55" title={row.externalId ?? undefined}>
                    {row.externalId ?? "—"}
                  </td>
                  <td className={`px-4 py-3 ${statusClass(row.status)}`}>{STATUS_LABEL[row.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId ? (
        <EventDetailDrawer key={selectedId} eventId={selectedId} onClose={closeDetail} />
      ) : null}
    </div>
  );
}
