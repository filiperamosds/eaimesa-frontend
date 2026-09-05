/** Adesivo do QR fixo: 8 cm × 10 cm (mesas e cardápio geral). */

export const QR_STICKER_WIDTH_MM = 80;
export const QR_STICKER_HEIGHT_MM = 100;
const PNG_DPI = 300;
const BRAND_NAME = "EaiMesa";
const BRAND_SITE = "eaimesa.com.br";
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="16" fill="#E23C14"/>
  <rect x="13.7" y="5.3" width="4.6" height="2.9" rx="1.45" fill="#FFFDF8"/>
  <rect x="13.7" y="23.8" width="4.6" height="2.9" rx="1.45" fill="#FFFDF8"/>
  <rect x="5.3" y="13.7" width="2.9" height="4.6" rx="1.45" fill="#FFFDF8"/>
  <rect x="23.8" y="13.7" width="2.9" height="4.6" rx="1.45" fill="#FFFDF8"/>
  <ellipse cx="16" cy="16" rx="8.5" ry="5.7" fill="#FFFDF8"/>
  <g transform="rotate(-22 18.5 16.15)">
    <rect x="16.45" y="12.45" width="4.15" height="7.45" rx="0.95" fill="#161311"/>
    <rect x="17" y="13.4" width="3.05" height="4.55" rx="0.35" fill="#FFFDF8"/>
    <circle cx="18.52" cy="18.85" r="0.38" fill="#FFFDF8"/>
  </g>
</svg>`;
const LOGO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  LOGO_SVG.replace("<svg ", '<svg width="64" height="64" '),
)}`;

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type QrStickerCopy = {
  venueName: string;
  tableLabel?: string;
  qrDataUrl: string;
};

function stickerHtml(copy: QrStickerCopy): string {
  const label = copy.tableLabel
    ? `<p class="label">${esc(copy.tableLabel)}</p>`
    : `<p class="label muted">Cardápio</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(copy.tableLabel ?? "Cardápio")}</title>
  <style>
    @page { size: ${QR_STICKER_WIDTH_MM}mm ${QR_STICKER_HEIGHT_MM}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: ${QR_STICKER_WIDTH_MM}mm;
      height: ${QR_STICKER_HEIGHT_MM}mm;
      background: #fff;
      color: #000;
    }
    .sticker {
      width: ${QR_STICKER_WIDTH_MM}mm;
      height: ${QR_STICKER_HEIGHT_MM}mm;
      padding: 5mm 4mm 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .venue {
      margin: 0;
      font: 600 11pt Georgia, serif;
      max-width: 72mm;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .label {
      margin: 2mm 0 0;
      font: 600 16pt Georgia, serif;
      color: #e23c14;
    }
    .label.muted { color: #161311; font-size: 14pt; }
    .qr {
      width: 48mm;
      height: 48mm;
      margin: 4mm 0 0;
    }
    .promo {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5mm;
      padding-top: 3mm;
    }
    .promo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      height: 8mm;
    }
    .promo-row .mark {
      width: 8mm;
      height: 8mm;
      flex: 0 0 8mm;
      display: block;
    }
    .promo p {
      margin: 0;
      padding: 0;
      line-height: 1;
    }
    .brand {
      font: 600 11pt Georgia, serif;
      color: #161311;
    }
    .site {
      font: 8pt system-ui, sans-serif;
      color: #6a5c51;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="sticker">
    <p class="venue">${esc(copy.venueName)}</p>
    ${label}
    <img class="qr" src="${esc(copy.qrDataUrl)}" alt="" />
    <div class="promo">
      <div class="promo-row">
        ${LOGO_SVG.replace("<svg ", '<svg class="mark" ')}
        <p class="brand">${esc(BRAND_NAME)}</p>
      </div>
      <p class="site">${esc(BRAND_SITE)}</p>
    </div>
  </div>
</body>
</html>`;
}

function px(mm: number) {
  return Math.round((mm / 25.4) * PNG_DPI);
}

export function printQrSticker(copy: QrStickerCopy) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-${QR_STICKER_WIDTH_MM}mm;top:0;width:${QR_STICKER_WIDTH_MM}mm;height:${QR_STICKER_HEIGHT_MM}mm;border:0;`;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(stickerHtml(copy));
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }
  const cleanup = () => iframe.remove();
  win.onafterprint = cleanup;
  win.focus();
  window.setTimeout(() => {
    win.print();
    window.setTimeout(cleanup, 2000);
  }, 200);
}

export async function renderQrStickerCanvas(copy: QrStickerCopy): Promise<HTMLCanvasElement> {
  const w = px(QR_STICKER_WIDTH_MM);
  const h = px(QR_STICKER_HEIGHT_MM);
  const card = document.createElement("canvas");
  card.width = w;
  card.height = h;
  const ctx = card.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  const img = new Image();
  img.src = copy.qrDataUrl;
  await img.decode();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#161311";
  ctx.font = `600 ${px(4.2)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(copy.venueName, w / 2, px(5), w - px(8));

  ctx.font = `600 ${px(copy.tableLabel ? 6.2 : 5.2)}px Georgia, serif`;
  ctx.fillStyle = copy.tableLabel ? "#e23c14" : "#161311";
  ctx.fillText(copy.tableLabel ?? "Cardápio", w / 2, px(12), w - px(8));

  const qrSize = px(48);
  const qrX = (w - qrSize) / 2;
  const qrY = px(22);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  const logo = new Image();
  logo.src = LOGO_DATA_URL;
  await logo.decode();
  const logoSize = px(8);
  const gap = px(2);
  ctx.font = `600 ${px(4)}px Georgia, serif`;
  const brandW = ctx.measureText(BRAND_NAME).width;
  const rowW = logoSize + gap + brandW;
  const rowX = (w - rowW) / 2;
  const rowY = h - px(16);
  ctx.drawImage(logo, rowX, rowY, logoSize, logoSize);
  ctx.fillStyle = "#161311";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(BRAND_NAME, rowX + logoSize + gap, rowY + logoSize / 2);
  ctx.fillStyle = "#6a5c51";
  ctx.font = `${px(2.8)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(BRAND_SITE, w / 2, rowY + logoSize + px(2.5));

  return card;
}

export async function downloadQrStickerPng(copy: QrStickerCopy, fileName: string) {
  const card = await renderQrStickerCanvas(copy);
  const a = document.createElement("a");
  a.download = fileName;
  a.href = card.toDataURL("image/png");
  a.click();
}
