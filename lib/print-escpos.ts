import { encodeEscPosKitchenTicket, encodeEscPosReceipt } from "./escpos-receipt";
import type { StaffOrder, StaffTableTab } from "./types";

type UsbEndpoint = { direction: string; endpointNumber: number; packetSize: number };
type UsbAlternate = { interfaceClass: number; endpoints: UsbEndpoint[] };
type UsbInterface = {
  interfaceNumber: number;
  claimed: boolean;
  alternate: UsbAlternate;
  alternates: UsbAlternate[];
};
type UsbConfiguration = { configurationValue: number; interfaces: UsbInterface[] };
type UsbDevice = {
  opened: boolean;
  configuration: UsbConfiguration | null;
  configurations: UsbConfiguration[];
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (value: number) => Promise<void>;
  claimInterface: (n: number) => Promise<void>;
  releaseInterface: (n: number) => Promise<void>;
  selectAlternateInterface: (n: number, alt: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<{ status: string; bytesWritten: number }>;
};
type UsbApi = {
  getDevices: () => Promise<UsbDevice[]>;
  requestDevice: (opts: { filters: Array<{ classCode?: number; vendorId?: number }> }) => Promise<UsbDevice>;
};

type SerialPort = {
  readable: unknown;
  writable: { getWriter: () => { write: (d: Uint8Array) => Promise<void>; releaseLock: () => void } } | null;
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
};
type SerialApi = {
  getPorts: () => Promise<SerialPort[]>;
  requestPort: (opts?: { filters: unknown[] }) => Promise<SerialPort>;
};

const USB_FILTERS: Array<{ classCode?: number; vendorId?: number }> = [
  { classCode: 7 },
  { vendorId: 0x0416 },
  { vendorId: 0x0483 },
  { vendorId: 0x0493 },
  { vendorId: 0x04b8 },
  { vendorId: 0x0519 },
  { vendorId: 0x0525 },
  { vendorId: 0x067b },
  { vendorId: 0x0dd4 },
  { vendorId: 0x0fe6 },
  { vendorId: 0x1504 },
  { vendorId: 0x1a86 },
  { vendorId: 0x1fc9 },
  { vendorId: 0x28e9 },
  { vendorId: 0x6868 },
];

function usbApi(): UsbApi | null {
  const usb = (navigator as Navigator & { usb?: UsbApi }).usb;
  return usb ?? null;
}

function serialApi(): SerialApi | null {
  const serial = (navigator as Navigator & { serial?: SerialApi }).serial;
  return serial ?? null;
}

function isCancelled(err: unknown) {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
  return name === "NotFoundError" || name === "AbortError" || name === "NotAllowedError";
}

function printError(err: unknown, fallback: string) {
  if (isCancelled(err)) {
    return new Error("Nenhuma térmica selecionada.");
  }
  const msg = err instanceof Error ? err.message : "";
  if (/claim|busy|access|protected/i.test(msg)) {
    return new Error(
      "O Mac/Windows está usando a POS80. Pause ou remova essa impressora em Ajustes → Impressoras e tente de novo.",
    );
  }
  if (err instanceof DOMException && err.name === "SecurityError") {
    return new Error("Abra o painel em HTTPS (ou localhost) para o Chrome falar com a térmica.");
  }
  return new Error(msg || fallback);
}

function pickOutEndpoint(device: UsbDevice): { iface: UsbInterface; endpoint: UsbEndpoint } {
  const config = device.configuration;
  if (!config) throw new Error("A térmica USB não respondeu.");
  const ranked = [...config.interfaces].sort((a, b) => {
    const ca = (a.alternates[0] ?? a.alternate).interfaceClass;
    const cb = (b.alternates[0] ?? b.alternate).interfaceClass;
    return (cb === 7 ? 1 : 0) - (ca === 7 ? 1 : 0);
  });
  for (const iface of ranked) {
    const alt = iface.alternates[0] ?? iface.alternate;
    const endpoint = alt.endpoints.find((e) => e.direction === "out");
    if (endpoint) return { iface, endpoint };
  }
  throw new Error("Esta USB não é uma impressora térmica.");
}

async function sendUsb(device: UsbDevice, data: Uint8Array) {
  if (!device.opened) await device.open();
  if (device.configuration == null) {
    const first = device.configurations[0];
    await device.selectConfiguration(first?.configurationValue ?? 1);
  }
  const { iface, endpoint } = pickOutEndpoint(device);
  try {
    if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
  } catch (err) {
    throw printError(err, "Não foi possível usar o USB da térmica.");
  }
  const chunk = Math.max(64, endpoint.packetSize || 64);
  for (let i = 0; i < data.length; i += chunk) {
    const piece = new Uint8Array(data.subarray(i, i + chunk));
    await device.transferOut(endpoint.endpointNumber, piece);
  }
}

async function sendSerial(port: SerialPort, data: Uint8Array) {
  const bauds = [9600, 115200];
  let last: unknown;
  for (const baudRate of bauds) {
    try {
      await port.open({ baudRate });
      const writable = port.writable;
      if (!writable) throw new Error("Porta serial sem envio.");
      const writer = writable.getWriter();
      try {
        await writer.write(new Uint8Array(data));
      } finally {
        writer.releaseLock();
      }
      await port.close();
      return;
    } catch (err) {
      last = err;
      try {
        await port.close();
      } catch {
        /* already closed */
      }
    }
  }
  throw printError(last, "Não foi possível enviar na porta serial.");
}

async function sendToGranted(data: Uint8Array): Promise<boolean> {
  const usb = usbApi();
  if (usb) {
    const devices = await usb.getDevices();
    const device = devices[0];
    if (device) {
      await sendUsb(device, data);
      return true;
    }
  }
  const serial = serialApi();
  if (serial) {
    const ports = await serial.getPorts();
    const port = ports[0];
    if (port) {
      await sendSerial(port, data);
      return true;
    }
  }
  return false;
}

async function requestAndSend(data: Uint8Array) {
  const usb = usbApi();
  const serial = serialApi();
  if (!usb && !serial) {
    throw new Error("Este navegador não fala USB com a térmica. Use o Chrome.");
  }
  if (usb) {
    try {
      let device: UsbDevice;
      try {
        device = await usb.requestDevice({ filters: [] });
      } catch (emptyErr) {
        if (emptyErr instanceof TypeError || (emptyErr instanceof DOMException && emptyErr.name === "TypeError")) {
          device = await usb.requestDevice({ filters: USB_FILTERS });
        } else {
          throw emptyErr;
        }
      }
      await sendUsb(device, data);
      return;
    } catch (err) {
      if (!isCancelled(err)) throw printError(err, "Falha no USB da térmica.");
    }
  }
  if (serial) {
    try {
      const port = await serial.requestPort({ filters: [] });
      await sendSerial(port, data);
      return;
    } catch (err) {
      throw printError(err, "Falha na porta serial da térmica.");
    }
  }
  throw new Error("Nenhuma térmica selecionada.");
}

export async function hasGrantedThermalPrinter(): Promise<boolean> {
  const usb = usbApi();
  if (usb && (await usb.getDevices()).length > 0) return true;
  const serial = serialApi();
  return Boolean(serial && (await serial.getPorts()).length > 0);
}

/** Pede a POS80 uma vez (gesto do usuário). Depois o Kanban imprime sem diálogo. */
export async function connectThermalPrinter(): Promise<void> {
  if (await hasGrantedThermalPrinter()) return;
  const usb = usbApi();
  const serial = serialApi();
  if (!usb && !serial) {
    throw new Error("Este navegador não fala USB com a térmica. Use o Chrome.");
  }
  if (usb) {
    try {
      try {
        await usb.requestDevice({ filters: [] });
      } catch (emptyErr) {
        if (emptyErr instanceof TypeError || (emptyErr instanceof DOMException && emptyErr.name === "TypeError")) {
          await usb.requestDevice({ filters: USB_FILTERS });
        } else {
          throw emptyErr;
        }
      }
      return;
    } catch (err) {
      if (!isCancelled(err)) throw printError(err, "Falha no USB da térmica.");
    }
  }
  if (serial) {
    try {
      await serial.requestPort({ filters: [] });
      return;
    } catch (err) {
      throw printError(err, "Falha na porta serial da térmica.");
    }
  }
  throw new Error("Nenhuma térmica selecionada.");
}

export async function sendEscPos(data: Uint8Array, promptIfNeeded = true) {
  if (await sendToGranted(data)) return;
  if (!promptIfNeeded) {
    throw new Error("Conecte a térmica no Kanban (Imprimir novos).");
  }
  await requestAndSend(data);
}

/** Envia o cupom em ESC/POS na POS80 (USB/serial). Não passa pelo diálogo A4 do Chrome. */
export async function printEscPosReceipt(venueName: string, tableLabel: string, tab: StaffTableTab) {
  await sendEscPos(encodeEscPosReceipt(venueName, tableLabel, tab), true);
}

/** Via da cozinha: um pedido. Sem prompt se a POS80 já estiver autorizada. */
export async function printEscPosOrder(order: StaffOrder, promptIfNeeded = true) {
  await sendEscPos(encodeEscPosKitchenTicket(order), promptIfNeeded);
}
