import QRCode from "qrcode";
import {
  QR_STICKER_HEIGHT_MM,
  QR_STICKER_WIDTH_MM,
  renderQrStickerCanvas,
  type QrStickerCopy,
} from "./print-qr-sticker";
import { publicMenuUrl } from "./public-url";

/** A4 paisagem: 3 × 2 adesivos de 8 × 10 cm, sem folga entre eles. */
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;
const COLS = 3;
const ROWS = 2;
const PER_PAGE = COLS * ROWS;

const enc = new TextEncoder();

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar o JPEG."));
          return;
        }
        void blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
      },
      "image/jpeg",
      0.92,
    );
  });
}

type Placed = {
  jpeg: Uint8Array;
  pixelW: number;
  pixelH: number;
  xMm: number;
  yMm: number;
};

function packStickers(
  items: { jpeg: Uint8Array; pixelW: number; pixelH: number }[],
): Placed[][] {
  const gridW = COLS * QR_STICKER_WIDTH_MM;
  const gridH = ROWS * QR_STICKER_HEIGHT_MM;
  const ox = (PAGE_W_MM - gridW) / 2;
  const oyTop = (PAGE_H_MM - gridH) / 2;
  const pages: Placed[][] = [];
  for (let i = 0; i < items.length; i += PER_PAGE) {
    const slice = items.slice(i, i + PER_PAGE);
    pages.push(
      slice.map((item, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const xMm = ox + col * QR_STICKER_WIDTH_MM;
        const yFromTop = oyTop + row * QR_STICKER_HEIGHT_MM;
        return {
          ...item,
          xMm,
          yMm: PAGE_H_MM - yFromTop - QR_STICKER_HEIGHT_MM,
        };
      }),
    );
  }
  return pages;
}

function pdfFromPages(pages: Placed[][]): Uint8Array {
  const pageW = mmToPt(PAGE_W_MM);
  const pageH = mmToPt(PAGE_H_MM);
  const sw = mmToPt(QR_STICKER_WIDTH_MM);
  const sh = mmToPt(QR_STICKER_HEIGHT_MM);

  const inners = new Map<number, Uint8Array>();
  let next = 3;
  function add(inner: Uint8Array) {
    const n = next;
    next += 1;
    inners.set(n, inner);
    return n;
  }

  const pageIds: number[] = [];
  for (const placed of pages) {
    const imgIds = placed.map((img) =>
      add(
        concat([
          enc.encode(
            `<< /Type /XObject /Subtype /Image /Width ${img.pixelW} /Height ${img.pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
          ),
          img.jpeg,
          enc.encode("\nendstream"),
        ]),
      ),
    );
    const draws: string[] = [];
    placed.forEach((img, i) => {
      const x = mmToPt(img.xMm);
      const y = mmToPt(img.yMm);
      draws.push(`q ${sw.toFixed(2)} 0 0 ${sh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${i} Do Q`);
      draws.push(`0.25 w 0.65 G ${x.toFixed(2)} ${y.toFixed(2)} ${sw.toFixed(2)} ${sh.toFixed(2)} re S`);
    });
    const streamBody = enc.encode(draws.join("\n"));
    const contentId = add(
      concat([enc.encode(`<< /Length ${streamBody.length} >>\nstream\n`), streamBody, enc.encode("\nendstream")]),
    );
    const xobjs = imgIds.map((id, i) => `/Im${i} ${id} 0 R`).join(" ");
    pageIds.push(
      add(
        enc.encode(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << ${xobjs} >> >> /Contents ${contentId} 0 R >>`,
        ),
      ),
    );
  }

  inners.set(1, enc.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  inners.set(2, enc.encode(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`));

  const header = enc.encode("%PDF-1.4\n%\x80\x80\x80\x80\n");
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let pos = header.length;
  for (let n = 1; n < next; n += 1) {
    const inner = inners.get(n);
    if (!inner) throw new Error("PDF incompleto.");
    const obj = concat([enc.encode(`${n} 0 obj\n`), inner, enc.encode("\nendobj\n")]);
    offsets[n] = pos;
    chunks.push(obj);
    pos += obj.length;
  }
  const xrefPos = pos;
  let xref = `xref\n0 ${next}\n0000000000 65535 f \n`;
  for (let n = 1; n < next; n += 1) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(enc.encode(xref));
  chunks.push(enc.encode(`trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`));
  return concat(chunks);
}

async function qrDataUrl(target: string) {
  return QRCode.toDataURL(target, {
    width: 640,
    margin: 2,
    color: { dark: "#161311", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export async function downloadTablesQrPdf(opts: {
  venueName: string;
  slug: string;
  includeGeneral: boolean;
  tables: { label: string; menuCode?: string | null }[];
  fileName: string;
}) {
  const copies: QrStickerCopy[] = [];
  if (opts.includeGeneral) {
    copies.push({
      venueName: opts.venueName,
      qrDataUrl: await qrDataUrl(publicMenuUrl(opts.slug)),
    });
  }
  for (const table of opts.tables) {
    copies.push({
      venueName: opts.venueName,
      tableLabel: table.label,
      qrDataUrl: await qrDataUrl(publicMenuUrl(opts.slug, { mesa: table.menuCode })),
    });
  }
  if (copies.length === 0) {
    throw new Error("Cadastre uma mesa ou use o QR geral.");
  }

  const rendered: { jpeg: Uint8Array; pixelW: number; pixelH: number }[] = [];
  for (const copy of copies) {
    const canvas = await renderQrStickerCanvas(copy);
    rendered.push({
      jpeg: await canvasJpeg(canvas),
      pixelW: canvas.width,
      pixelH: canvas.height,
    });
  }

  const bytes = pdfFromPages(packStickers(rendered));
  const a = document.createElement("a");
  a.download = opts.fileName;
  a.href = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4_000);
}
