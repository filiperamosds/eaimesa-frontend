"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";

type VenueRow = { id: string; name: string; slug: string };

type ImportResult = {
  ok: boolean;
  replaced: boolean;
  removed: { categories: number; items: number };
  created: { categories: number; items: number };
  skippedItems: number;
};

const EXAMPLE = `{
  "categories": [
    {
      "name": "Porções",
      "itens": [
        {
          "name": "Caldos",
          "description": "",
          "price": 20.0
        }
      ]
    }
  ]
}`;

function countPreview(text: string): { ok: true; categories: number; items: number } | { ok: false; error: string } {
  if (!text.trim()) {
    return { ok: false, error: "Cole o JSON do cardápio." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON inválido." };
  }
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const categories = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.categories)
      ? root.categories
      : null;
  if (!categories) {
    return { ok: false, error: 'Esperado { "categories": [...] }.' };
  }
  let items = 0;
  for (const cat of categories) {
    if (!cat || typeof cat !== "object") continue;
    const row = cat as Record<string, unknown>;
    const list = Array.isArray(row.itens) ? row.itens : Array.isArray(row.items) ? row.items : [];
    items += list.length;
  }
  return { ok: true, categories: categories.length, items };
}

function AdminCatalogImportInner() {
  const search = useSearchParams();
  const initialVenue = search.get("venue") ?? "";
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [venueId, setVenueId] = useState(initialVenue);
  const [json, setJson] = useState("");
  const [replace, setReplace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ venues: VenueRow[] }>("/v1/platform/venues")
      .then((data) => {
        setVenues(data.venues);
        setVenueId((cur) => cur || data.venues[0]?.id || "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao listar estabelecimentos."));
  }, []);

  const preview = useMemo(() => countPreview(json), [json]);
  const venue = venues.find((v) => v.id === venueId);

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJson(text);
    };
    reader.onerror = () => setError("Não foi possível ler o arquivo.");
    reader.readAsText(file);
  }

  async function submit() {
    setError(null);
    setResult(null);
    if (!venueId) {
      setError("Selecione um estabelecimento.");
      return;
    }
    if (!preview.ok) {
      setError(preview.error);
      return;
    }
    if (replace) {
      const label = venue ? `${venue.name} (/${venue.slug})` : "este estabelecimento";
      const ok = window.confirm(
        `Substituir o cardápio de ${label}?\n\nIsso apaga categorias e itens atuais (incluindo modificadores e fichas técnicas). Pedidos antigos não mudam.`,
      );
      if (!ok) return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("JSON inválido.");
      return;
    }
    const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const categories = Array.isArray(parsed)
      ? parsed
      : Array.isArray(root?.categories)
        ? root.categories
        : null;
    if (!categories) {
      setError('Esperado { "categories": [...] }.');
      return;
    }
    setPending(true);
    try {
      const data = await api<ImportResult>(`/v1/platform/venues/${venueId}/catalog/import`, {
        method: "POST",
        body: JSON.stringify({ replace, categories }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao importar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar cardápio</h1>
        <p className="mt-1 text-sm text-white/55">
          Cole um JSON com categorias e itens (preço em reais). O campo{" "}
          <code className="text-white/80">itens</code> ou <code className="text-white/80">items</code> é aceito.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Estabelecimento</span>
        <select
          className="field-night"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
        >
          {venues.length === 0 ? <option value="">Nenhum bar</option> : null}
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} /{v.slug}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Arquivo JSON (opcional)</span>
        <input
          type="file"
          accept="application/json,.json"
          className="text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">JSON</span>
        <textarea
          className="field-night min-h-72 font-mono text-[13px] leading-relaxed"
          spellCheck={false}
          placeholder={EXAMPLE}
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setResult(null);
          }}
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          className="mt-1"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        <span>
          Substituir o cardápio atual. Sem isso, categorias com o mesmo nome recebem itens novos (duplicados pelo nome
          são ignorados).
        </span>
      </label>

      {preview.ok ? (
        <p className="text-sm text-white/55">
          Prévia: {preview.categories} categoria{preview.categories === 1 ? "" : "s"}, {preview.items} item
          {preview.items === 1 ? "" : "s"}.
        </p>
      ) : json.trim() ? (
        <p className="text-sm text-chili">{preview.error}</p>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {result ? (
        <p className="text-sm text-sage-soft">
          Importado: {result.created.categories} categoria{result.created.categories === 1 ? "" : "s"} e{" "}
          {result.created.items} item{result.created.items === 1 ? "" : "s"}
          {result.replaced
            ? ` (apagados ${result.removed.categories} categorias e ${result.removed.items} itens)`
            : null}
          {result.skippedItems ? ` · ${result.skippedItems} item(ns) já existiam e foram ignorados` : null}.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !venueId}
          onClick={() => void submit()}
          className="btn-secondary !bg-white/10 !text-white"
        >
          {pending ? "Importando…" : "Importar"}
        </button>
        <Link href="/admin/bares" className="text-sm text-white/50 hover:text-white">
          Voltar aos estabelecimentos
        </Link>
      </div>
    </div>
  );
}

export function AdminCatalogImport() {
  return (
    <Suspense
      fallback={<p className="text-sm text-white/55">Carregando importador…</p>}
    >
      <AdminCatalogImportInner />
    </Suspense>
  );
}
