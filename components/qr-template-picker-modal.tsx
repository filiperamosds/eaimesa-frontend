"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  downloadQrPosterPng,
  parseQrPrintTemplateId,
  printQrPoster,
  QR_PRINT_TEMPLATES,
  type QrPrintTemplateId,
} from "../lib/qr-print-templates";
import { publicMenuUrl } from "../lib/public-url";
import type { Venue } from "../lib/types";
import { QrPoster } from "./qr-poster";

type Props = {
  slug: string;
  venueName: string;
  templateId: string;
  onSaved: (venue: Venue) => void;
  onClose: () => void;
};

function slugifyFile(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function qrPng(target: string) {
  return QRCode.toDataURL(target, {
    width: 640,
    margin: 2,
    color: { dark: "#161311", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function QrTemplatePickerModal({ slug, venueName, templateId, onSaved, onClose }: Props) {
  const [selected, setSelected] = useState<QrPrintTemplateId>(() => parseQrPrintTemplateId(templateId));
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(parseQrPrintTemplateId(templateId));
  }, [templateId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  useEffect(() => {
    const target = publicMenuUrl(slug);
    qrPng(target)
      .then(setQrDataUrl)
      .catch(() => setError("Não foi possível gerar o QR."));
  }, [slug]);

  const copy = {
    venueName,
    qrDataUrl,
  };

  async function persist(id: QrPrintTemplateId) {
    const previous = selected;
    setSelected(id);
    setError(null);
    setBusy(true);
    try {
      const venue = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ qrPrintTemplate: id }),
      });
      onSaved(venue);
    } catch (err) {
      setSelected(previous);
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o template.");
    } finally {
      setBusy(false);
    }
  }

  async function printSelected() {
    const template = QR_PRINT_TEMPLATES.find((t) => t.id === selected);
    if (!template || !qrDataUrl) return;
    setError(null);
    setBusy(true);
    try {
      await printQrPoster(template, { venueName, qrDataUrl });
    } catch {
      setError("Não foi possível imprimir o poster.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSelected() {
    const template = QR_PRINT_TEMPLATES.find((t) => t.id === selected);
    if (!template || !qrDataUrl) return;
    setError(null);
    setBusy(true);
    try {
      await downloadQrPosterPng(
        template,
        { venueName, qrDataUrl },
        `eaimesa-${slugifyFile(slug)}-${template.id}.png`,
      );
    } catch {
      setError("Não foi possível exportar o poster.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-template-title"
    >
      <div className="surface flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[1.35rem] sm:p-6">
        <div className="shrink-0">
          <p className="eyebrow">Impressão do QR</p>
          <h2 id="qr-template-title" className="mt-1.5 font-serif text-xl sm:mt-2 sm:text-2xl">
            Escolha o template
          </h2>
          <p className="mt-1 text-sm text-ink-soft sm:mt-2">
            Salvo no estabelecimento. Poster 8 × 11 cm.
            <span className="sm:hidden"> Deslize para o lado para ver todos.</span>
          </p>
        </div>
        <div className="-mx-4 mt-4 min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:-mx-6 sm:mt-6">
          <div className="flex snap-x snap-mandatory gap-3 px-4 pb-1 sm:gap-5 sm:px-6">
            {QR_PRINT_TEMPLATES.map((template) => {
              const active = selected === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (template.id === selected) return;
                    void persist(template.id);
                  }}
                  className="w-[min(58vw,11.5rem)] shrink-0 snap-start cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-left disabled:cursor-wait sm:w-[11.5rem]"
                  aria-pressed={active}
                >
                  <div
                    className={`overflow-hidden rounded-md transition ${
                      active
                        ? "ring-2 ring-chili ring-offset-2 ring-offset-card sm:ring-offset-4"
                        : "ring-1 ring-transparent"
                    }`}
                  >
                    {qrDataUrl ? (
                      <QrPoster template={template} copy={copy} />
                    ) : (
                      <div className="aspect-[8/11] animate-pulse bg-line/60" />
                    )}
                  </div>
                  <p className="mt-2 font-serif text-base text-ink sm:mt-3 sm:text-xl">{template.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{template.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
        {error ? <p className="mt-3 shrink-0 text-sm text-chili">{error}</p> : null}
        <div className="mt-4 flex shrink-0 flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">
            Fechar
          </button>
          <button
            type="button"
            disabled={busy || !qrDataUrl}
            onClick={() => void printSelected()}
            className="btn-secondary w-full !py-2 text-sm sm:w-auto"
          >
            Imprimir
          </button>
          <button
            type="button"
            disabled={busy || !qrDataUrl}
            onClick={() => void downloadSelected()}
            className="btn-primary w-full !py-2 text-sm sm:w-auto"
          >
            Exportar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
