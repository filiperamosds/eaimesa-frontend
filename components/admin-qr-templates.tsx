"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { api, apiUpload, ApiError } from "../lib/api";
import { publicMenuUrl } from "../lib/public-url";
import { mapQrPrintTemplateDto, type QrPrintTemplateDto } from "../lib/qr-print-templates";
import { AdminNightDialog } from "./admin-night-dialog";
import { QrPoster } from "./qr-poster";

type Draft = QrPrintTemplateDto;

const emptyDraft = (): Omit<Draft, "sortOrder"> => ({
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

async function sampleQrPng() {
  return QRCode.toDataURL(publicMenuUrl("seu-bar"), {
    width: 320,
    margin: 2,
    color: { dark: "#161311", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

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
        <input className="field-night" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export function AdminQrTemplates() {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Draft | "new" | null>(null);

  async function load() {
    const data = await api<{ templates: Draft[] }>("/v1/platform/qr-print-templates");
    setRows(data.templates);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar templates."));
  }, []);

  if (!rows) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Impressão</p>
          <h1 className="mt-2 font-serif text-3xl">Templates de QR</h1>
        </div>
        <button
          type="button"
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
          onClick={() => {
            setOk(null);
            setEditing("new");
          }}
        >
          Adicionar
        </button>
      </div>
      <p className="text-sm text-white/45">Clique no template para editar cores, foto e frase.</p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => {
                setOk(null);
                setEditing(row);
              }}
              className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-white/10"
                  style={{ background: row.circle }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium">
                    {row.name} <span className="text-white/40">{row.id}</span>
                  </p>
                  <p className="mt-1 truncate text-sm text-white/55">{row.subtitle || "Sem descrição"}</p>
                </div>
              </div>
              <span
                className={`mt-1 inline-block w-fit rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider sm:mt-0 ${
                  row.active ? "border-white/15 text-white/70" : "border-amber/40 text-amber"
                }`}
              >
                {row.active ? "Ativo" : "Inativo"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-white/45">Nenhum template ainda.</p> : null}

      {editing ? (
        <QrTemplateDialog
          template={editing === "new" ? null : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSaved={async (msg, next) => {
            setOk(msg);
            setError(null);
            await load();
            setEditing(next ?? null);
          }}
          setPending={setPending}
        />
      ) : null}
    </div>
  );
}

function QrTemplateDialog({
  template,
  pending,
  onClose,
  onSaved,
  setPending,
}: {
  template: Draft | null;
  pending: boolean;
  onClose: () => void;
  onSaved: (msg: string, next?: Draft) => Promise<void>;
  setPending: (v: boolean) => void;
}) {
  const creating = template === null;
  const [draft, setDraft] = useState<Omit<Draft, "sortOrder">>(() =>
    template ? { ...template } : emptyDraft(),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    sampleQrPng().then(setQrDataUrl).catch(() => {});
  }, []);

  const previewTemplate = useMemo(
    () =>
      mapQrPrintTemplateDto({
        ...draft,
        caption: draft.photoUrl ? null : draft.caption,
        sortOrder: 0,
      }),
    [draft],
  );

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function save() {
    setPending(true);
    setLocalError(null);
    try {
      if (creating) {
        const id = draft.id.trim() || slugifyId(draft.name);
        await api("/v1/platform/qr-print-templates", {
          method: "POST",
          body: JSON.stringify({
            id,
            name: draft.name,
            subtitle: draft.subtitle,
            tagline: draft.tagline,
            caption: draft.caption,
            background: draft.background,
            circle: draft.circle,
            brand: draft.circle,
            pill: draft.pill,
            active: draft.active,
          }),
        });
        const data = await api<{ templates: Draft[] }>("/v1/platform/qr-print-templates");
        const row = data.templates.find((t) => t.id === id);
        await onSaved("Template criado. Envie a foto se quiser.", row);
      } else {
        await api(`/v1/platform/qr-print-templates/${template.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name,
            subtitle: draft.subtitle,
            tagline: draft.tagline,
            caption: draft.photoUrl ? null : draft.caption,
            background: draft.background,
            circle: draft.circle,
            brand: draft.circle,
            pill: draft.pill,
            photoUrl: draft.photoUrl,
            photoFit: draft.photoFit,
            photoHeight: draft.photoHeight,
            active: draft.active,
          }),
        });
        await onSaved(`Template ${draft.name} salvo.`);
      }
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  async function upload(file: File) {
    if (!template) return;
    setPending(true);
    setLocalError(null);
    try {
      await apiUpload(`/v1/platform/qr-print-templates/${template.id}/image`, file);
      const data = await api<{ templates: Draft[] }>("/v1/platform/qr-print-templates");
      const next = data.templates.find((t) => t.id === template.id);
      if (next) setDraft(next);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminNightDialog
      kicker="Template"
      title={creating ? "Novo template" : draft.name || template.name}
      pending={pending}
      extraWide
      onClose={onClose}
    >
      <div className="mt-5 flex flex-col-reverse gap-5 sm:flex-row">
        <div className="min-w-0 flex-1">
          <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Título</span>
          <input
            className="field-night"
            value={draft.name}
            onChange={(e) =>
              patch({
                name: e.target.value,
                ...(creating && !draft.id ? { id: slugifyId(e.target.value) } : {}),
              })
            }
            placeholder="Pizzaria"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Id (slug)</span>
          <input
            className="field-night"
            value={draft.id}
            onChange={(e) => patch({ id: slugifyId(e.target.value) })}
            placeholder="pizzaria"
            disabled={!creating}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-white/60">Descrição</span>
          <input
            className="field-night"
            value={draft.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
            placeholder="Sem identificação da mesa"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Texto no círculo</span>
          <input
            className="field-night"
            value={draft.tagline}
            onChange={(e) => patch({ tagline: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Frase no lugar da foto</span>
          <input
            className="field-night"
            value={draft.caption ?? ""}
            onChange={(e) => patch({ caption: e.target.value })}
            placeholder="O que vai pedir hoje?"
          />
        </label>
        <ColorField label="Fundo" value={draft.background} onChange={(background) => patch({ background })} />
        <ColorField
          label="Círculo"
          value={draft.circle}
          onChange={(circle) => patch({ circle, brand: circle })}
        />
        <ColorField label="Faixa" value={draft.pill} onChange={(pill) => patch({ pill })} />
          </div>

          {!creating ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm">
                <span className="btn-ghost inline-block cursor-pointer !py-1.5 text-sm">Trocar imagem</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(file);
                  }}
                />
              </label>
              {draft.photoUrl ? (
                <button
                  type="button"
                  className="text-sm text-white/55 underline"
                  onClick={() => patch({ photoUrl: null })}
                >
                  Remover foto (usar frase)
                </button>
              ) : (
                <p className="text-sm text-white/45">Sem foto — usa a frase.</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-white/45">Depois de criar, o envio da foto libera neste mesmo dialog.</p>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => patch({ active: e.target.checked })}
            />
            Ativo
          </label>
        </div>

        <div className="mx-auto w-[11.5rem] shrink-0 sm:sticky sm:top-0 sm:self-start">
          <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
            Prévia
          </p>
          <div className="overflow-hidden rounded-md ring-1 ring-white/15">
            {qrDataUrl ? (
              <QrPoster
                template={previewTemplate}
                copy={{ venueName: "Seu bar", qrDataUrl }}
              />
            ) : (
              <div className="aspect-[8/11] bg-white/5" />
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-white/35">Poster 8 × 11 cm</p>
        </div>
      </div>

      {localError ? <p className="mt-3 text-sm text-chili">{localError}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className="btn-ghost text-white/80">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
        >
          {pending ? "Salvando…" : creating ? "Criar" : "Salvar"}
        </button>
      </div>
    </AdminNightDialog>
  );
}
