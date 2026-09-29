"use client";

import { useEffect, useState } from "react";
import { api, apiUpload, ApiError } from "../lib/api";
import { mediaSrc } from "../lib/media";
import type { QrPrintTemplateDto } from "../lib/qr-print-templates";

type Draft = QrPrintTemplateDto;

const emptyCreate = (): Omit<Draft, "sortOrder"> => ({
  id: "",
  name: "",
  subtitle: "",
  tagline: "Escaneie e explore",
  caption: "O que vai pedir hoje?",
  background: "#E8E3D2",
  circle: "#2C241F",
  brand: "#2C241F",
  pill: "#F4EFE1",
  photoUrl: null,
  photoFit: "contain",
  photoHeight: 0.28,
  active: true,
});

function slugifyId(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-white/60">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-white/15 bg-transparent p-0"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <input
          className="field-night"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

export function AdminQrTemplates() {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [create, setCreate] = useState(emptyCreate);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    const data = await api<{ templates: Draft[] }>("/v1/platform/qr-print-templates");
    setRows(data.templates);
    setDrafts(Object.fromEntries(data.templates.map((t) => [t.id, { ...t }])));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar templates."));
  }, []);

  function patchDraft(id: string, partial: Partial<Draft>) {
    setDrafts((cur) => {
      const d = cur[id];
      if (!d) return cur;
      return { ...cur, [id]: { ...d, ...partial } };
    });
  }

  async function save(id: string) {
    const d = drafts[id];
    if (!d) return;
    setPending(id);
    setError(null);
    setOk(null);
    try {
      await api(`/v1/platform/qr-print-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: d.name,
          subtitle: d.subtitle,
          tagline: d.tagline,
          caption: d.photoUrl ? null : d.caption,
          background: d.background,
          circle: d.circle,
          brand: d.circle,
          pill: d.pill,
          photoUrl: d.photoUrl,
          photoFit: d.photoFit,
          photoHeight: d.photoHeight,
          active: d.active,
        }),
      });
      setOk(`Template ${d.name} salvo.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(null);
    }
  }

  async function createTemplate() {
    setPending("create");
    setError(null);
    setOk(null);
    try {
      const id = create.id.trim() || slugifyId(create.name);
      await api("/v1/platform/qr-print-templates", {
        method: "POST",
        body: JSON.stringify({
          id,
          name: create.name,
          subtitle: create.subtitle,
          tagline: create.tagline,
          caption: create.caption,
          background: create.background,
          circle: create.circle,
          brand: create.circle,
          pill: create.pill,
          active: create.active,
        }),
      });
      setCreate(emptyCreate());
      setOk("Template criado.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    } finally {
      setPending(null);
    }
  }

  async function upload(id: string, file: File) {
    setPending(id);
    setError(null);
    setOk(null);
    try {
      await apiUpload(`/v1/platform/qr-print-templates/${id}/image`, file);
      setOk("Imagem enviada.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setPending(null);
    }
  }

  if (!rows) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Impressão</p>
        <h1 className="mt-2 font-serif text-3xl">Templates de QR</h1>
        <p className="mt-2 text-sm text-white/55">
          Cores, foto ou frase no rodapé do poster. Só os ativos aparecem para o estabelecimento.
        </p>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <div className="rounded-2xl border border-dashed border-amber/40 bg-white/5 p-5">
        <p className="font-medium">Criar template</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Título</span>
            <input
              className="field-night"
              value={create.name}
              onChange={(e) =>
                setCreate((c) => ({
                  ...c,
                  name: e.target.value,
                  id: c.id || slugifyId(e.target.value),
                }))
              }
              placeholder="Pizzaria"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Id (slug)</span>
            <input
              className="field-night"
              value={create.id}
              onChange={(e) => setCreate((c) => ({ ...c, id: slugifyId(e.target.value) }))}
              placeholder="pizzaria"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-white/60">Descrição</span>
            <input
              className="field-night"
              value={create.subtitle}
              onChange={(e) => setCreate((c) => ({ ...c, subtitle: e.target.value }))}
              placeholder="Sem identificação da mesa"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Texto no círculo</span>
            <input
              className="field-night"
              value={create.tagline}
              onChange={(e) => setCreate((c) => ({ ...c, tagline: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Frase no lugar da foto</span>
            <input
              className="field-night"
              value={create.caption ?? ""}
              onChange={(e) => setCreate((c) => ({ ...c, caption: e.target.value }))}
              placeholder="O que vai pedir hoje?"
            />
          </label>
          <ColorField
            label="Fundo"
            value={create.background}
            onChange={(background) => setCreate((c) => ({ ...c, background }))}
          />
          <ColorField
            label="Círculo"
            value={create.circle}
            onChange={(circle) => setCreate((c) => ({ ...c, circle, brand: circle }))}
          />
          <ColorField label="Faixa" value={create.pill} onChange={(pill) => setCreate((c) => ({ ...c, pill }))} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={create.active}
            onChange={(e) => setCreate((c) => ({ ...c, active: e.target.checked }))}
          />
          Ativo
        </label>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void createTemplate()}
          className="btn-primary mt-4 !py-2 text-sm"
        >
          Criar template
        </button>
      </div>

      {rows.map((row) => {
        const d = drafts[row.id] ?? row;
        const photo = mediaSrc(d.photoUrl);
        return (
          <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-white/40">{row.id}</p>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60">
                {d.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Título</span>
                <input
                  className="field-night"
                  value={d.name}
                  onChange={(e) => patchDraft(row.id, { name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Descrição</span>
                <input
                  className="field-night"
                  value={d.subtitle}
                  onChange={(e) => patchDraft(row.id, { subtitle: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Texto no círculo</span>
                <input
                  className="field-night"
                  value={d.tagline}
                  onChange={(e) => patchDraft(row.id, { tagline: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Frase (se não houver foto)</span>
                <input
                  className="field-night"
                  value={d.caption ?? ""}
                  onChange={(e) => patchDraft(row.id, { caption: e.target.value })}
                />
              </label>
              <ColorField
                label="Fundo"
                value={d.background}
                onChange={(background) => patchDraft(row.id, { background })}
              />
              <ColorField
                label="Círculo"
                value={d.circle}
                onChange={(circle) => patchDraft(row.id, { circle, brand: circle })}
              />
              <ColorField label="Faixa" value={d.pill} onChange={(pill) => patchDraft(row.id, { pill })} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {photo ? (
                <img src={photo} alt="" className="h-16 w-24 rounded object-contain bg-black/30" />
              ) : (
                <p className="text-sm text-white/45">Sem foto — usa a frase.</p>
              )}
              <label className="text-sm">
                <span className="btn-ghost inline-block cursor-pointer !py-1.5 text-sm">Trocar imagem</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(row.id, file);
                  }}
                />
              </label>
              {d.photoUrl ? (
                <button
                  type="button"
                  className="text-sm text-white/55 underline"
                  onClick={() => patchDraft(row.id, { photoUrl: null })}
                >
                  Remover foto (usar frase)
                </button>
              ) : null}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.active}
                onChange={(e) => patchDraft(row.id, { active: e.target.checked })}
              />
              Ativo
            </label>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void save(row.id)}
              className="btn-primary mt-4 !py-2 text-sm"
            >
              Salvar {d.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
