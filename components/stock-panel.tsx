"use client";

import {
  formatStockQty,
  STOCK_UNITS,
  stockUnitLabel,
  type StockItem,
  type StockUnit,
} from "@eaimesa/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

export function StockPanel() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<StockUnit>("g");
  const [packages, setPackages] = useState("2");
  const [packageSize, setPackageSize] = useState("1000");
  const [alertQty, setAlertQty] = useState("400");

  const load = useCallback(async () => {
    const data = await api<{ items: StockItem[] }>("/v1/owner/stock/items");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar o estoque."))
      .finally(() => setLoading(false));
  }, [load]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/owner/stock/items", {
        method: "POST",
        body: JSON.stringify({
          name,
          unit,
          packages: Number(packages) || 0,
          packageSize: Number(packageSize) || 0,
          alertQuantity: alertQty === "" ? null : Number(alertQty),
        }),
      });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando estoque…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl">Estoque</h2>
      </div>
      {items.some((i) => i.low) ? (
        <div className="rounded-2xl border border-chili/25 bg-chili/5 px-4 py-3 text-sm">
          <p className="font-medium text-chili">Estoque baixo</p>
          <p className="mt-1 text-ink-soft">
            {items
              .filter((i) => i.low)
              .map((i) => `${i.name} (${formatStockQty(i.quantity, i.unit)})`)
              .join(" · ")}
            . Cadastre uma entrada ou ajuste o alerta.
          </p>
        </div>
      ) : null}
      <form onSubmit={addItem} className="surface grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Insumo (ex. Arroz)"
          className="field lg:col-span-2"
          required
          maxLength={80}
        />
        <select value={unit} onChange={(e) => setUnit(e.target.value as StockUnit)} className="field">
          {STOCK_UNITS.map((u) => (
            <option key={u} value={u}>
              {stockUnitLabel(u)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={packages}
          onChange={(e) => setPackages(e.target.value)}
          className="field"
          placeholder="Pacotes"
          required
        />
        <input
          type="number"
          min={1}
          value={packageSize}
          onChange={(e) => setPackageSize(e.target.value)}
          className="field"
          placeholder={unit === "un" ? "Un. por pacote" : `Tamanho (${unit})`}
          required
        />
        <input
          type="number"
          min={0}
          value={alertQty}
          onChange={(e) => setAlertQty(e.target.value)}
          className="field sm:col-span-2 lg:col-span-2"
          placeholder="Alerta (opcional)"
        />
        <button type="submit" className="btn-primary !py-2 text-sm sm:col-span-2 lg:col-span-3">
          Cadastrar entrada
        </button>
      </form>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-ink-soft">Nenhum insumo ainda. Comece pelo arroz, carne, óleo…</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <StockRow key={item.id} item={item} onChange={load} onError={setError} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StockRow({
  item,
  onChange,
  onError,
}: {
  item: StockItem;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [packages, setPackages] = useState("1");
  const [packageSize, setPackageSize] = useState(item.unit === "g" || item.unit === "ml" ? "1000" : "1");
  const [alertQty, setAlertQty] = useState(item.alertQuantity === null ? "" : String(item.alertQuantity));
  const [busy, setBusy] = useState(false);

  async function entrada(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await api(`/v1/owner/stock/items/${item.id}/movements`, {
        method: "POST",
        body: JSON.stringify({
          type: "in",
          packages: Number(packages) || 0,
          packageSize: Number(packageSize) || 0,
        }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha na entrada.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAlert() {
    onError(null);
    try {
      await api(`/v1/owner/stock/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ alertQuantity: alertQty === "" ? null : Number(alertQty) }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar o alerta.");
    }
  }

  async function archive() {
    if (!confirm(`Arquivar ${item.name}?`)) return;
    onError(null);
    try {
      await api(`/v1/owner/stock/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível arquivar.");
    }
  }

  return (
    <li className="surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">
            {item.name}
            {item.low ? (
              <span className="ml-2 rounded-full bg-chili/10 px-2 py-0.5 text-xs text-chili">baixo</span>
            ) : null}
          </p>
          <p className="text-sm text-ink-soft">
            Saldo {formatStockQty(item.quantity, item.unit)}
            {item.alertQuantity !== null
              ? ` · alerta ${formatStockQty(item.alertQuantity, item.unit)}`
              : " · sem alerta"}
          </p>
        </div>
        <button type="button" onClick={() => void archive()} className="text-sm text-ink-soft hover:text-chili">
          Arquivar
        </button>
      </div>
      <form onSubmit={entrada} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-soft">
          Pacotes
          <input
            type="number"
            min={1}
            value={packages}
            onChange={(e) => setPackages(e.target.value)}
            className="field mt-1 w-20 py-1"
          />
        </label>
        <label className="text-xs text-ink-soft">
          de ({item.unit})
          <input
            type="number"
            min={1}
            value={packageSize}
            onChange={(e) => setPackageSize(e.target.value)}
            className="field mt-1 w-24 py-1"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-secondary py-1.5 text-sm">
          Entrada
        </button>
        <label className="ml-auto text-xs text-ink-soft">
          Alerta
          <input
            type="number"
            min={0}
            value={alertQty}
            onChange={(e) => setAlertQty(e.target.value)}
            onBlur={() => void saveAlert()}
            className="field mt-1 w-24 py-1"
            placeholder="—"
          />
        </label>
      </form>
    </li>
  );
}
