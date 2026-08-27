"use client";

import { useEffect, useState } from "react";
import { connectThermalPrinter, hasGrantedThermalPrinter } from "../lib/print-escpos";
import { isThermalAutoPrintEnabled, setThermalAutoPrintEnabled } from "../lib/thermal-print-pref";

export function ThermalPrintSettings() {
  const [on, setOn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const pref = isThermalAutoPrintEnabled();
    if (!pref) return;
    void hasGrantedThermalPrinter().then((ok) => {
      if (ok) setOn(true);
      else setThermalAutoPrintEnabled(false);
    });
  }, []);

  async function toggle(next: boolean) {
    setError(null);
    setMsg(null);
    if (!next) {
      setThermalAutoPrintEnabled(false);
      setOn(false);
      setMsg("Impressão automática desligada.");
      return;
    }
    setPending(true);
    try {
      await connectThermalPrinter();
      setThermalAutoPrintEnabled(true);
      setOn(true);
      setMsg("Pedidos novos saem na POS80 neste Chrome, sem a caixa de imprimir.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conectar a térmica.");
      setThermalAutoPrintEnabled(false);
      setOn(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <label className="surface flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-chili"
          checked={on}
          disabled={pending}
          onChange={(e) => void toggle(e.target.checked)}
        />
        <span>
          <span className="block font-medium">Imprimir pedidos novos na térmica</span>
          <span className="mt-1 block text-sm text-ink-soft">
            Liga neste computador (Chrome). A POS80 precisa estar no USB; se o Mac já a tiver como
            impressora do sistema, pause essa fila em Ajustes. O Kanban não abre a caixa de imprimir.
          </span>
        </span>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
    </div>
  );
}
