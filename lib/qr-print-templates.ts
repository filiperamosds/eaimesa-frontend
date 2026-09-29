/** Poster do QR fixo: 8 cm × 11 cm (mesas e cardápio geral). */

export const QR_POSTER_WIDTH_MM = 80;
export const QR_POSTER_HEIGHT_MM = 110;
const PNG_DPI = 300;

export const QR_POSTER_LAYOUT = {
  pillTop: 0.03,
  pillWidth: 0.66,
  pillHeight: 0.055,
  circleCy: 0.36,
  circleDiameter: 0.82,
  qrCy: 0.32,
  qrSize: 0.44,
  qrPad: 0.08,
  taglineCy: 0.57,
  footerH: 0.055,
  tablePillTop: 0.096,
  tablePillHeight: 0.042,
  tablePillWidth: 0.52,
} as const;

export const QR_POSTER_SITE = "eaimesa.com";

export const QR_PRINT_TEMPLATE_DEFAULT = "restaurant";

/** Ids conhecidos hoje. Novos posters entram nesta união e em `QR_PRINT_TEMPLATES`. */
export type QrPrintTemplateId = "generic" | "restaurant" | "quibes" | "bar";

export type QrPrintTemplate = {
  id: QrPrintTemplateId;
  name: string;
  subtitle: string;
  tagline: string;
  background: string;
  circle: string;
  brand: string;
  pill: string;
  photoSrc?: string;
  photoFit?: "contain" | "cover";
  photoHeight?: number;
};

export const QR_PRINT_TEMPLATES: QrPrintTemplate[] = [
  {
    id: "generic",
    name: "Genérico",
    subtitle: "Sem ilustração",
    tagline: "Escaneie e explore",
    background: "#E8E3D2",
    circle: "#2C241F",
    brand: "#2C241F",
    pill: "#F4EFE1",
  },
  {
    id: "restaurant",
    name: "Restaurante",
    subtitle: "Sem identificação da mesa",
    tagline: "Escaneie e explore",
    background: "#E8E3D2",
    circle: "#1B5A44",
    brand: "#1B5A44",
    pill: "#F4EFE1",
    photoSrc: "/qr-templates/restaurant.png?v=7",
    photoFit: "contain",
    photoHeight: 0.28,
  },
  {
    id: "quibes",
    name: "Quibes",
    subtitle: "Sem identificação da mesa",
    tagline: "Escaneie e explore",
    background: "#EDE4D0",
    circle: "#6B3E1F",
    brand: "#6B3E1F",
    pill: "#F6EEDC",
    photoSrc: "/qr-templates/quibes.png?v=1",
    photoFit: "contain",
    photoHeight: 0.32,
  },
  {
    id: "bar",
    name: "Bar",
    subtitle: "Sem identificação da mesa",
    tagline: "Escaneie e explore",
    background: "#E8D6C6",
    circle: "#6F3A4A",
    brand: "#6F3A4A",
    pill: "#F6EBE3",
    photoSrc: "/qr-templates/bar.png?v=7",
    photoFit: "contain",
    photoHeight: 0.32,
  },
];

export function isQrPrintTemplateId(id: string): id is QrPrintTemplateId {
  return QR_PRINT_TEMPLATES.some((t) => t.id === id);
}

export function parseQrPrintTemplateId(raw: string | null | undefined): QrPrintTemplateId {
  return raw && isQrPrintTemplateId(raw) ? raw : QR_PRINT_TEMPLATE_DEFAULT;
}

export function qrPrintTemplateById(id: string | null | undefined): QrPrintTemplate {
  const found = QR_PRINT_TEMPLATES.find((t) => t.id === id);
  if (found) return found;
  const fallback = QR_PRINT_TEMPLATES.find((t) => t.id === QR_PRINT_TEMPLATE_DEFAULT);
  if (!fallback) throw new Error("Nenhum template de QR cadastrado.");
  return fallback;
}

export type QrPosterCopy = {
  venueName: string;
  qrDataUrl: string;
  tableLabel?: string;
};

const TEMPLATE_STORAGE_KEY = "eaimesa.qrPrintTemplate";

/** Só para migrar escolha antiga do navegador para o venue. */
export function loadQrPrintTemplateId(): QrPrintTemplateId {
  if (typeof window === "undefined") return QR_PRINT_TEMPLATE_DEFAULT;
  return parseQrPrintTemplateId(window.localStorage.getItem(TEMPLATE_STORAGE_KEY));
}

export function clearQrPrintTemplateLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assetHref(src: string) {
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

function px(mm: number) {
  return Math.round((mm / 25.4) * PNG_DPI);
}

function posterCss(template: QrPrintTemplate): string {
  const L = QR_POSTER_LAYOUT;
  return `
    .qr-poster {
      position: relative;
      overflow: hidden;
      width: ${QR_POSTER_WIDTH_MM}mm;
      height: ${QR_POSTER_HEIGHT_MM}mm;
      background: ${template.background};
      color: ${template.brand};
      font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
      container-type: size;
    }
    .qr-poster-pill {
      position: absolute;
      z-index: 5;
      top: ${L.pillTop * 100}%;
      left: 50%;
      transform: translateX(-50%);
      width: ${L.pillWidth * 100}%;
      height: ${L.pillHeight * 100}%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: ${template.pill};
      font-weight: 650;
      font-size: 4.1cqw;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${template.brand};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 3%;
      box-sizing: border-box;
    }
    .qr-poster-table {
      position: absolute;
      z-index: 5;
      top: ${L.tablePillTop * 100}%;
      left: 50%;
      transform: translateX(-50%);
      width: ${L.tablePillWidth * 100}%;
      height: ${L.tablePillHeight * 100}%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: ${template.pill};
      font-weight: 650;
      font-size: 3.4cqw;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${template.brand};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 3%;
      box-sizing: border-box;
    }
    .qr-poster-circle {
      position: absolute;
      z-index: 1;
      left: 50%;
      top: ${L.circleCy * 100}%;
      width: ${L.circleDiameter * 100}%;
      height: 0;
      padding-bottom: ${L.circleDiameter * 100}%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: ${template.circle};
      box-sizing: content-box;
    }
    .qr-poster-qr {
      position: absolute;
      z-index: 4;
      left: 50%;
      top: ${L.qrCy * 100}%;
      width: ${L.qrSize * 100}%;
      height: 0;
      padding-bottom: ${L.qrSize * 100}%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 11%;
      box-sizing: content-box;
      box-shadow: 0 8px 28px rgba(22, 19, 17, 0.12);
      overflow: hidden;
    }
    .qr-poster-qr img {
      position: absolute;
      top: ${L.qrPad * 100}%;
      left: ${L.qrPad * 100}%;
      width: ${(1 - L.qrPad * 2) * 100}%;
      height: ${(1 - L.qrPad * 2) * 100}%;
      max-width: none;
      object-fit: contain;
      object-position: center;
      display: block;
    }
    .qr-poster-tagline {
      position: absolute;
      z-index: 4;
      left: 50%;
      top: ${L.taglineCy * 100}%;
      transform: translate(-50%, -50%);
      width: 82%;
      text-align: center;
      color: #fff;
      font-weight: 650;
      font-size: 3.45cqw;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .qr-poster-photo {
      position: absolute;
      z-index: 2;
      left: 0;
      width: 100%;
      bottom: ${L.footerH * 100}%;
      height: ${(template.photoHeight ?? 0.28) * 100}%;
      object-fit: ${template.photoFit ?? "contain"};
      object-position: center bottom;
      pointer-events: none;
    }
    .qr-poster-footer {
      position: absolute;
      z-index: 5;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${L.footerH * 100}%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${template.pill};
      color: ${template.brand};
      font-weight: 650;
      font-size: 4.5cqw;
      letter-spacing: 0.08em;
    }
  `;
}

function qrPosterInnerHtml(template: QrPrintTemplate, copy: QrPosterCopy): string {
  const table = copy.tableLabel
    ? `<div class="qr-poster-table">${esc(copy.tableLabel)}</div>`
    : "";
  return `
    <div class="qr-poster">
      <div class="qr-poster-circle"></div>
      <div class="qr-poster-pill">${esc(copy.venueName)}</div>
      ${table}
      <div class="qr-poster-qr"><img src="${esc(copy.qrDataUrl)}" alt="" /></div>
      <p class="qr-poster-tagline">${esc(template.tagline)}</p>
      ${
        template.photoSrc
          ? `<img class="qr-poster-photo" src="${esc(assetHref(template.photoSrc))}" alt="" />`
          : ""
      }
      <div class="qr-poster-footer">${esc(QR_POSTER_SITE)}</div>
    </div>`;
}

function posterHtml(template: QrPrintTemplate, copy: QrPosterCopy): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(copy.venueName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&display=swap" />
  <style>
    @page { size: ${QR_POSTER_WIDTH_MM}mm ${QR_POSTER_HEIGHT_MM}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: ${QR_POSTER_WIDTH_MM}mm;
      height: ${QR_POSTER_HEIGHT_MM}mm;
      background: #fff;
    }
    p { margin: 0; }
    ${posterCss(template)}
  </style>
</head>
<body>
  ${qrPosterInnerHtml(template, copy)}
</body>
</html>`;
}

function waitImages(doc: Document): Promise<void> {
  const images = [...doc.images];
  return Promise.all(images.map((img) => img.decode().catch(() => undefined))).then(() => undefined);
}

export async function printQrPoster(template: QrPrintTemplate, copy: QrPosterCopy) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-${QR_POSTER_WIDTH_MM}mm;top:0;width:${QR_POSTER_WIDTH_MM}mm;height:${QR_POSTER_HEIGHT_MM}mm;border:0;`;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(posterHtml(template, copy));
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }
  await waitImages(doc);
  const cleanup = () => iframe.remove();
  win.onafterprint = cleanup;
  win.focus();
  window.setTimeout(() => {
    win.print();
    window.setTimeout(cleanup, 2000);
  }, 200);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a arte do template."));
    img.src = src;
  });
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: "contain" | "cover",
) {
  const ir = img.width / img.height;
  const r = w / h;
  let dw: number;
  let dh: number;
  if (fit === "cover" ? ir > r : ir <= r) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export async function renderQrPosterCanvas(
  template: QrPrintTemplate,
  copy: QrPosterCopy,
): Promise<HTMLCanvasElement> {
  const L = QR_POSTER_LAYOUT;
  const w = px(QR_POSTER_WIDTH_MM);
  const h = px(QR_POSTER_HEIGHT_MM);
  const card = document.createElement("canvas");
  card.width = w;
  card.height = h;
  const ctx = card.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  const [qr, photo] = await Promise.all([
    loadImage(copy.qrDataUrl),
    template.photoSrc ? loadImage(assetHref(template.photoSrc)) : Promise.resolve(null),
  ]);

  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, w, h);

  const circleR = (w * L.circleDiameter) / 2;
  ctx.fillStyle = template.circle;
  ctx.beginPath();
  ctx.arc(w / 2, h * L.circleCy, circleR, 0, Math.PI * 2);
  ctx.fill();

  const qrSize = w * L.qrSize;
  const qrX = (w - qrSize) / 2;
  const qrY = h * L.qrCy - qrSize / 2;
  const qrRadius = qrSize * 0.11;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX, qrY, qrSize, qrSize, qrRadius);
  ctx.fill();
  const pad = qrSize * L.qrPad;
  ctx.drawImage(qr, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `650 ${Math.round(w * 0.0345)}px Outfit, sans-serif`;
  ctx.fillText(template.tagline.toUpperCase(), w / 2, h * L.taglineCy, w * 0.82);

  if (photo && template.photoSrc) {
    const photoHeight = template.photoHeight ?? 0.28;
    drawPhoto(
      ctx,
      photo,
      0,
      h * (1 - L.footerH - photoHeight),
      w,
      h * photoHeight,
      template.photoFit ?? "contain",
    );
  }

  const pillW = w * L.pillWidth;
  const pillH = h * L.pillHeight;
  const pillX = (w - pillW) / 2;
  const pillY = h * L.pillTop;
  ctx.fillStyle = template.pill;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = template.brand;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `650 ${Math.round(w * 0.041)}px Outfit, sans-serif`;
  ctx.fillText(ellipsis(ctx, copy.venueName.toUpperCase(), pillW * 0.86), w / 2, pillY + pillH / 2);

  if (copy.tableLabel) {
    const tW = w * L.tablePillWidth;
    const tH = h * L.tablePillHeight;
    const tX = (w - tW) / 2;
    const tY = h * L.tablePillTop;
    ctx.fillStyle = template.pill;
    ctx.beginPath();
    ctx.roundRect(tX, tY, tW, tH, tH / 2);
    ctx.fill();
    ctx.fillStyle = template.brand;
    ctx.font = `650 ${Math.round(w * 0.034)}px Outfit, sans-serif`;
    ctx.fillText(ellipsis(ctx, copy.tableLabel.toUpperCase(), tW * 0.86), w / 2, tY + tH / 2);
  }

  const footH = h * L.footerH;
  ctx.fillStyle = template.pill;
  ctx.fillRect(0, h - footH, w, footH);
  ctx.fillStyle = template.brand;
  ctx.font = `650 ${Math.round(w * 0.045)}px Outfit, sans-serif`;
  ctx.fillText(QR_POSTER_SITE, w / 2, h - footH / 2);

  return card;
}

export async function downloadQrPosterPng(
  template: QrPrintTemplate,
  copy: QrPosterCopy,
  fileName: string,
) {
  const card = await renderQrPosterCanvas(template, copy);
  const a = document.createElement("a");
  a.download = fileName;
  a.href = card.toDataURL("image/png");
  a.click();
}
