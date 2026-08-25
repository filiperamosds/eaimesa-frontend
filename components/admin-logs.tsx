"use client";

import {
  ERROR_CODES,
  LOG_LEVELS,
  LOG_LINE_OPTIONS,
  LOG_LINES_DEFAULT,
  platformLogListSchema,
  platformLogViewSchema,
  type PlatformLogFile,
  type PlatformLogView,
} from "@eaimesa/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModified(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function pickDefaultFile(files: PlatformLogFile[]): string | null {
  const laravel = files.find((f) => f.name === "laravel.log");
  return laravel?.name ?? files[0]?.name ?? null;
}

function levelClass(level: string | null): string {
  const l = (level ?? "").toUpperCase();
  if (l === "ERROR" || l === "CRITICAL" || l === "ALERT" || l === "EMERGENCY") return "text-chili";
  if (l === "WARNING") return "text-amber";
  if (l === "INFO" || l === "NOTICE") return "text-sage-soft";
  return "text-white/45";
}

export function AdminLogs() {
  const router = useRouter();
  const [files, setFiles] = useState<PlatformLogFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<PlatformLogView | null>(null);
  const [lines, setLines] = useState<number>(LOG_LINES_DEFAULT);
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [raw, setRaw] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingView, setLoadingView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      setError(err.code === ERROR_CODES.LOG_NOT_FOUND ? err.message : "Ficheiro de log não encontrado.");
      return;
    }
    setError(err instanceof ApiError ? err.message : "Falha ao carregar os logs.");
  }

  async function loadFiles(): Promise<PlatformLogFile[]> {
    const data = platformLogListSchema.parse(await api("/v1/platform/logs"));
    setFiles(data.files);
    return data.files;
  }

  async function loadView(name: string, nextLines = lines, nextLevel = level, nextQ = q) {
    const params = new URLSearchParams();
    params.set("lines", String(nextLines));
    if (nextLevel) params.set("level", nextLevel);
    const query = nextQ.trim();
    if (query) params.set("q", query);
    const data = platformLogViewSchema.parse(
      await api(`/v1/platform/logs/${encodeURIComponent(name)}?${params.toString()}`),
    );
    setView(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const list = await loadFiles();
        if (cancelled) return;
        const name = pickDefaultFile(list);
        setSelected(name);
        if (name) {
          setLoadingView(true);
          await loadView(name);
        }
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) {
          setLoadingList(false);
          setLoadingView(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh(name = selected) {
    setError(null);
    setLoadingList(true);
    setLoadingView(Boolean(name));
    try {
      const list = await loadFiles();
      const next = name && list.some((f) => f.name === name) ? name : pickDefaultFile(list);
      setSelected(next);
      if (next) await loadView(next);
      else setView(null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingList(false);
      setLoadingView(false);
    }
  }

  async function selectFile(name: string) {
    setSelected(name);
    setError(null);
    setLoadingView(true);
    try {
      await loadView(name);
    } catch (err) {
      handleError(err);
      setView(null);
    } finally {
      setLoadingView(false);
    }
  }

  const fileSelect = (
    <label className="block text-sm lg:hidden">
      <span className="mb-1 block text-white/60">Ficheiro</span>
      <select
        className="field-night"
        value={selected ?? ""}
        disabled={loadingList || files.length === 0}
        onChange={(e) => {
          if (e.target.value) void selectFile(e.target.value);
        }}
      >
        {files.length === 0 ? <option value="">Nenhum ficheiro</option> : null}
        {files.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name} · {formatBytes(f.sizeBytes)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Operação</p>
        <h1 className="mt-2 font-serif text-3xl">Logs</h1>
        <p className="mt-2 text-sm text-white/55">
          Tail dos ficheiros em storage/logs. Sem apagar, descarregar ou stream.
        </p>
      </div>

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <p className="mb-2 text-sm text-white/60">Ficheiros</p>
          {loadingList && files.length === 0 ? (
            <p className="text-sm text-white/45">Carregando…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-white/45">Nenhum ficheiro de log.</p>
          ) : (
            <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
              {files.map((f) => {
                const active = f.name === selected;
                return (
                  <li key={f.name}>
                    <button
                      type="button"
                      onClick={() => void selectFile(f.name)}
                      className={`w-full px-3 py-3 text-left ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <p className="truncate font-mono text-sm">{f.name}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatBytes(f.sizeBytes)} · {formatModified(f.modifiedAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="space-y-4">
          {fileSelect}

          <form
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void refresh();
            }}
          >
            <label className="block text-sm sm:w-28">
              <span className="mb-1 block text-white/60">Linhas</span>
              <select
                className="field-night"
                value={lines}
                onChange={(e) => setLines(Number(e.target.value))}
              >
                {LOG_LINE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:w-40">
              <span className="mb-1 block text-white/60">Nível</span>
              <select className="field-night" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Todos</option>
                {LOG_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 flex-1 text-sm">
              <span className="mb-1 block text-white/60">Busca</span>
              <input
                className="field-night"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Texto no log"
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={loadingView || loadingList} className="btn-secondary !bg-white/10 !text-white">
              Atualizar
            </button>
          </form>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} />
            Texto bruto
          </label>

          {view?.truncated ? (
            <p className="text-sm text-amber">Mostrando só o final do ficheiro.</p>
          ) : null}

          {loadingView ? (
            <p className="text-sm text-white/45">Carregando…</p>
          ) : !selected ? (
            <p className="text-sm text-white/45">Nenhum ficheiro de log.</p>
          ) : raw ? (
            <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/80">
              {view?.content || "(vazio)"}
            </pre>
          ) : !view || view.entries.length === 0 ? (
            <p className="text-sm text-white/45">Nenhuma entrada com esse filtro.</p>
          ) : (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {view.entries.map((entry, i) => (
                <li key={`${entry.timestamp ?? "n"}-${i}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                    <span className={`font-medium tracking-wide ${levelClass(entry.level)}`}>
                      {entry.level ?? "—"}
                    </span>
                    {entry.timestamp ? (
                      <span className="text-white/40">{formatModified(entry.timestamp)}</span>
                    ) : null}
                    {entry.env ? <span className="text-white/35">{entry.env}</span> : null}
                  </div>
                  <pre className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/85">
                    {entry.message}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
