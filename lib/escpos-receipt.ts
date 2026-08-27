import { formatBrlFromCents, GUEST_ORDER_STATUS_LABEL, type OrderStatus } from "@eaimesa/shared";
import type { StaffTableTab } from "./types";

/** Font A em papel 80 mm: 48 colunas. */
export const ESCPOS_COLS = 48;

const ESC = 0x1b;
const GS = 0x1d;

/** CP850 — português na POS80 genérica. */
const CP850: Record<string, number> = {
  Ç: 0x80,
  ü: 0x81,
  é: 0x82,
  â: 0x83,
  ä: 0x84,
  à: 0x85,
  ç: 0x87,
  ê: 0x88,
  ë: 0x89,
  è: 0x8a,
  ï: 0x8b,
  î: 0x8c,
  ì: 0x8d,
  Ä: 0x8e,
  É: 0x90,
  ô: 0x93,
  ö: 0x94,
  ò: 0x95,
  û: 0x96,
  ù: 0x97,
  Ö: 0x99,
  Ü: 0x9a,
  á: 0xa0,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ñ: 0xa4,
  Ñ: 0xa5,
  ª: 0xa6,
  º: 0xa7,
  "¿": 0xa8,
  "Á": 0xb5,
  "Â": 0xb6,
  À: 0xb7,
  ã: 0xc6,
  Ã: 0xc7,
  "Ê": 0xd2,
  "Ë": 0xd3,
  È: 0xd4,
  Í: 0xd6,
  Î: 0xd7,
  Ï: 0xd8,
  "Ó": 0xe0,
  ß: 0xe1,
  Ô: 0xe2,
  Ò: 0xe3,
  õ: 0xe4,
  Õ: 0xe5,
  μ: 0xe6,
  Ú: 0xe9,
  Û: 0xea,
  Ù: 0xeb,
  ý: 0xec,
  Ý: 0xed,
  "°": 0xf8,
};

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

function money(cents: number) {
  return formatBrlFromCents(cents).replace(/\u00a0/g, " ");
}

function encodeCp850(value: string): Uint8Array {
  const chars = [...value.replace(/\u00a0/g, " ")];
  const out = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? "";
    const code = ch.charCodeAt(0);
    if (code < 128) {
      out[i] = code;
      continue;
    }
    out[i] = CP850[ch] ?? 0x3f;
  }
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function cmd(...bytes: number[]) {
  return new Uint8Array(bytes);
}

function text(value: string) {
  return encodeCp850(value);
}

function wrap(value: string, width: number): string[] {
  const lines: string[] = [];
  let rest = value;
  while (rest.length > width) {
    lines.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  if (rest.length > 0) lines.push(rest);
  return lines;
}

function pair(left: string, right: string): string {
  const r = right.slice(0, ESCPOS_COLS);
  const gap = ESCPOS_COLS - left.length - r.length;
  if (gap >= 1) return `${left}${" ".repeat(gap)}${r}`;
  const maxLeft = Math.max(0, ESCPOS_COLS - r.length - 1);
  return `${left.slice(0, maxLeft)} ${r}`;
}

function center(value: string): string {
  if (value.length >= ESCPOS_COLS) return value.slice(0, ESCPOS_COLS);
  const pad = Math.floor((ESCPOS_COLS - value.length) / 2);
  return `${" ".repeat(pad)}${value}`;
}

function dash() {
  return `${"-".repeat(ESCPOS_COLS)}\n`;
}

function itemBlock(qty: number, name: string, price: string, note: string | null): string {
  const left = `${qty}x ${name}`;
  const lines = [pair(left, price)];
  if (left.length + 1 + price.length > ESCPOS_COLS) {
    lines.length = 0;
    const firstWidth = Math.max(8, ESCPOS_COLS - price.length - 1);
    lines.push(pair(left.slice(0, firstWidth), price));
    lines.push(...wrap(left.slice(firstWidth).trim(), ESCPOS_COLS));
  }
  if (note) lines.push(...wrap(`  ${note}`, ESCPOS_COLS));
  return `${lines.join("\n")}\n`;
}

/** Bytes ESC/POS do cupom de conferência (POS80 80 mm). */
export function encodeEscPosReceipt(venueName: string, tableLabel: string, tab: StaffTableTab): Uint8Array {
  const active = tab.orders.filter((o) => o.status !== "cancelled");
  const cancelled = tab.orders.filter((o) => o.status === "cancelled");
  const chunks: Uint8Array[] = [
    cmd(ESC, 0x40),
    cmd(ESC, 0x74, 0x02),
    cmd(ESC, 0x61, 0x01),
    text(`${center(venueName.toUpperCase())}\n`),
    text(`${center("Comprovante de conferência")}\n`),
    cmd(ESC, 0x61, 0x00),
    text(dash()),
    text(`${center(`${tableLabel}  ${tab.guestName}`)}\n`),
    text(`${center(tab.guestPhoneMasked)}\n`),
    text(`${center(`Aberta em ${when(tab.createdAt)}`)}\n`),
    text(dash()),
  ];

  if (active.length === 0) {
    chunks.push(cmd(ESC, 0x61, 0x01), text("Nenhum item nesta comanda.\n"), cmd(ESC, 0x61, 0x00));
  } else {
    for (const order of active) {
      const status = GUEST_ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status;
      chunks.push(text(`${pair(status, when(order.createdAt))}\n`));
      for (const item of order.items) {
        chunks.push(text(itemBlock(item.qty, item.name, money(item.unitPriceCents * item.qty), item.note)));
      }
      if (order.note) chunks.push(text(`${wrap(`Obs.: ${order.note}`, ESCPOS_COLS).join("\n")}\n`));
      chunks.push(text("\n"));
    }
  }

  if (cancelled.length > 0) {
    chunks.push(text(dash()), text("Cancelados (fora do total)\n"));
    for (const order of cancelled) {
      chunks.push(
        text(`${wrap(order.items.map((i) => `${i.qty}x ${i.name}`).join(", "), ESCPOS_COLS).join("\n")}\n`),
      );
    }
  }

  chunks.push(
    text(dash()),
    cmd(ESC, 0x61, 0x00),
    cmd(GS, 0x21, 0x10),
    text(`${pair("TOTAL", money(tab.totalCents))}\n`),
    cmd(GS, 0x21, 0x00),
    cmd(ESC, 0x61, 0x01),
    text("\nDocumento de conferência\nnão é cupom fiscal.\n"),
    cmd(ESC, 0x61, 0x00),
    text("\n\n\n"),
    cmd(GS, 0x56, 0x41, 0x03),
  );

  return concat(chunks);
}
