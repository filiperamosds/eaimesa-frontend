"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { downloadQrStickerPng, printQrSticker } from "../lib/print-qr-sticker";
import { publicMenuUrl } from "../lib/public-url";

type Props = {
  slug: string;
  venueName: string;
  /** Rótulo impresso no adesivo (ex. Mesa 4). */
  tableLabel?: string;
  /** Código opaco → URL `?mesa=` (plano Cardápio / chamada). */
  mesaCode?: string | null;
  /** Auto atendimento menciona comanda; Cardápio não. */
  servicePlan?: boolean;
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

export function MenuQrModal({
  slug,
  venueName,
  tableLabel,
  mesaCode,
  servicePlan = false,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const target = publicMenuUrl(slug, { mesa: mesaCode });
    setUrl(target);
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, target, {
      width: 280,
      margin: 2,
      color: { dark: "#161311", light: "#fffdf8" },
      errorCorrectionLevel: "M",
    }).catch(() => setError("Não foi possível gerar o QR."));
  }, [slug, mesaCode]);

  async function stickerCopy() {
    const target = url || publicMenuUrl(slug, { mesa: mesaCode });
    return {
      venueName,
      tableLabel,
      qrDataUrl: await qrPng(target),
    };
  }

  async function downloadPng() {
    setError(null);
    setBusy(true);
    try {
      const name = tableLabel
        ? `eaimesa-${slugifyFile(slug)}-${slugifyFile(tableLabel)}.png`
        : `eaimesa-${slugifyFile(slug)}-cardapio.png`;
      await downloadQrStickerPng(await stickerCopy(), name);
    } catch {
      setError("Não foi possível exportar o adesivo.");
    } finally {
      setBusy(false);
    }
  }

  async function printSticker() {
    setError(null);
    setBusy(true);
    try {
      printQrSticker(await stickerCopy());
    } catch {
      setError("Não foi possível imprimir o adesivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-qr-title"
    >
      <div className="surface w-full max-w-md p-5">
        <p className="eyebrow">QR fixo</p>
        <h2 id="menu-qr-title" className="mt-2 font-serif text-2xl">
          {tableLabel ? tableLabel : "Cardápio do estabelecimento"}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {servicePlan ? (
            <>
              Aponta para o cardápio. <strong className="font-medium text-ink">Não abre comanda</strong> —
              pedir exige o QR do garçom.
            </>
          ) : mesaCode ? (
            <>QR desta mesa: o celular identifica o lugar para chamar o garçom, se estiver ligado.</>
          ) : (
            <>QR geral do cardápio (porta / Instagram). Sem identificação de mesa.</>
          )}
        </p>
        <div className="mt-5 flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-2xl border border-line bg-card" />
          {error ? <p className="mt-2 text-sm text-chili">{error}</p> : null}
          {url ? (
            <p className="mt-3 break-all text-center text-xs text-ink-soft">{url.replace(/^https?:\/\//, "")}</p>
          ) : null}
          <p className="mt-2 text-center text-xs text-ink-soft">Adesivo 8 × 10 cm</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Fechar
          </button>
          <button
            type="button"
            disabled={busy || !url}
            onClick={() => void printSticker()}
            className="btn-secondary !py-2 text-sm"
          >
            Imprimir
          </button>
          <button
            type="button"
            disabled={busy || !url}
            onClick={() => void downloadPng()}
            className="btn-primary !py-2 text-sm"
          >
            Exportar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
