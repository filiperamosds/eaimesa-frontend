import { formatBrlFromCents, GUEST_ORDER_STATUS_LABEL, type OrderStatus } from "@eaimesa/shared";
import type { StaffTableTab } from "./types";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** HTML isolado 80 mm — a térmica não recebe o app (CSS/JS), só o cupom. */
export function thermalReceiptHtml(venueName: string, tableLabel: string, tab: StaffTableTab): string {
  const active = tab.orders.filter((o) => o.status !== "cancelled");
  const cancelled = tab.orders.filter((o) => o.status === "cancelled");

  const items = active
    .map((order) => {
      const lines = order.items
        .map((item) => {
          const note = item.note ? `<div class="muted">${esc(item.note)}</div>` : "";
          return `<div class="row"><span>${item.qty}x ${esc(item.name)}${note}</span><span>${esc(formatBrlFromCents(item.unitPriceCents * item.qty))}</span></div>`;
        })
        .join("");
      const obs = order.note ? `<div class="muted">Obs.: ${esc(order.note)}</div>` : "";
      const status = GUEST_ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status;
      return `<div class="block"><div class="row muted"><span>${esc(status)}</span><span>${esc(when(order.createdAt))}</span></div>${lines}${obs}</div>`;
    })
    .join("");

  const cancelledHtml =
    cancelled.length === 0
      ? ""
      : `<div class="rule muted">Cancelados (fora do total)<br>${cancelled
          .map((order) => esc(order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")))
          .join("<br>")}</div>`;

  const body =
    active.length === 0
      ? `<p class="center muted">Nenhum item nesta comanda.</p>`
      : items;

  const feeOn = (tab.serviceFeePercent ?? 0) > 0;
  const due = tab.dueCents ?? tab.totalCents + (tab.serviceFeeCents ?? 0);
  const feeHtml = feeOn
    ? `<div class="row"><span>Itens</span><span>${esc(formatBrlFromCents(tab.totalCents))}</span></div>
  <div class="row muted"><span>Taxa de serviço (${tab.serviceFeePercent}%)</span><span>${esc(formatBrlFromCents(tab.serviceFeeCents ?? 0))}</span></div>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cupom</title>
  <style>
    @page { size: 80mm 297mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 2mm;
      width: 80mm;
      background: #fff;
      color: #000;
      font: 12px/1.35 "Courier New", ui-monospace, monospace;
    }
    h1 { font-size: 14px; text-align: center; text-transform: uppercase; margin: 0 0 4px; }
    .center { text-align: center; }
    .muted { color: #000; font-size: 11px; }
    .rule { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin: 8px 0; }
    .block { margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
    .total b { font-size: 16px; }
    .fine { text-align: center; font-size: 10px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${esc(venueName)}</h1>
  <p class="center muted">Comprovante de conferência</p>
  <div class="rule center">${esc(tableLabel)} · ${esc(tab.guestName)}</div>
  <p class="center muted">${esc(tab.guestPhoneMasked)}<br>Aberta em ${esc(when(tab.createdAt))}</p>
  ${body}
  ${cancelledHtml}
  ${feeHtml}
  <div class="total"><span>TOTAL A RECEBER</span><b>${esc(formatBrlFromCents(due))}</b></div>
  <p class="fine">Documento de conferência — não é cupom fiscal.</p>
</body>
</html>`;
}

function printHtmlInIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-80mm;top:0;width:80mm;height:297mm;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
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

/** Diálogo do sistema — só laser/PDF. POS80 no Chrome vira A4/PostScript. */
export function printSystemReceipt(venueName: string, tableLabel: string, tab: StaffTableTab) {
  printHtmlInIframe(thermalReceiptHtml(venueName, tableLabel, tab));
}

/** @deprecated use printSystemReceipt */
export function printThermalReceipt(venueName: string, tableLabel: string, tab: StaffTableTab) {
  printSystemReceipt(venueName, tableLabel, tab);
}
