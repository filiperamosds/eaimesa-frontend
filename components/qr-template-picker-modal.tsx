"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  downloadQrPosterPng,
  loadQrPrintTemplateId,
  printQrPoster,
  QR_PRINT_TEMPLATES,
  saveQrPrintTemplateId,
  type QrPrintTemplateId,
} from "../lib/qr-print-templates";
import { publicMenuUrl } from "../lib/public-url";
import { QrPoster } from "./qr-poster";

type Props = {
  slug: string;
  venueName: string;
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

export function QrTemplatePickerModal({ slug, venueName, onClose }: Props) {
  const [selected, setSelected] = useState<QrPrintTemplateId>(loadQrPrintTemplateId);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-template-title"
    >
      <div className="surface w-full max-w-2xl p-5 sm:p-6">
        <p className="eyebrow">Impressão do QR</p>
        <h2 id="qr-template-title" className="mt-2 font-serif text-2xl">
          Escolha o template
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          O QR aponta para o cardápio geral, sem identificar a mesa. Poster 8 × 11 cm.
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {QR_PRINT_TEMPLATES.map((template) => {
            const active = selected === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelected(template.id);
                  saveQrPrintTemplateId(template.id);
                }}
                className="w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                aria-pressed={active}
              >
                <div
                  className={`overflow-hidden rounded-md transition ${
                    active ? "ring-2 ring-chili ring-offset-4 ring-offset-card" : "ring-1 ring-transparent"
                  }`}
                >
                  {qrDataUrl ? (
                    <QrPoster template={template} copy={copy} />
                  ) : (
                    <div className="aspect-[8/11] animate-pulse bg-line/60" />
                  )}
                </div>
                <p className="mt-4 font-serif text-xl text-ink">{template.name}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{template.subtitle}</p>
              </button>
            );
          })}
        </div>
        {error ? <p className="mt-4 text-sm text-chili">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Fechar
          </button>
          <button
            type="button"
            disabled={busy || !qrDataUrl}
            onClick={() => void printSelected()}
            className="btn-secondary !py-2 text-sm"
          >
            Imprimir
          </button>
          <button
            type="button"
            disabled={busy || !qrDataUrl}
            onClick={() => void downloadSelected()}
            className="btn-primary !py-2 text-sm"
          >
            Exportar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
