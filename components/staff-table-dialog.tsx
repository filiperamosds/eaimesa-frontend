"use client";

import { ERROR_CODES, formatBrlFromCents, openComandaSchema } from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffOrder, StaffTableTab, StaffTableTabsPayload } from "../lib/types";
import { PhoneField } from "./masked-fields";
import { StaffAddOrderDialog } from "./staff-add-order-dialog";
import { StaffTabReceipt } from "./staff-tab-receipt";

type Props = {
  tableId: string;
  tableLabel: string;
  venueName: string;
  canClose: boolean;
  onClose: () => void;
  onGenerateQr: () => void;
  onChanged: () => void;
};

function mergeOrders(
  payload: StaffTableTabsPayload,
  boardOrders: StaffOrder[],
  overlay: Record<string, StaffOrder[]>,
): StaffTableTabsPayload {
  const forTable = boardOrders.filter((o) => o.tableId === payload.table.id);
  const tabs = payload.tabs.map((tab) => {
    const fromBoard = forTable.filter((o) => o.tabId === tab.id && !tab.orders.some((x) => x.id === o.id));
    const fromOverlay = (overlay[tab.id] ?? []).filter(
      (o) => !tab.orders.some((x) => x.id === o.id) && !fromBoard.some((x) => x.id === o.id),
    );
    const orders = [...fromOverlay, ...fromBoard, ...tab.orders];
    const totalCents = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.totalCents, 0);
    return { ...tab, orders, totalCents };
  });
  const seen = new Set(tabs.flatMap((t) => t.orders.map((o) => o.id)));
  const unassigned: StaffOrder[] = [];
  for (const o of [...(payload.unassignedOrders ?? []), ...forTable.filter((o) => !o.tabId)]) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    unassigned.push(o);
  }
  return { ...payload, tabs, unassignedOrders: unassigned };
}

export function StaffTableDialog({
  tableId,
  tableLabel,
  venueName,
  canClose,
  onClose,
  onGenerateQr,
  onChanged,
}: Props) {
  const [raw, setRaw] = useState<StaffTableTabsPayload | null>(null);
  const [boardOrders, setBoardOrders] = useState<StaffOrder[]>([]);
  const [overlay, setOverlay] = useState<Record<string, StaffOrder[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingTab, setAddingTab] = useState<StaffTableTab | null>(null);
  const [openingTab, setOpeningTab] = useState(false);
  const [receiptTab, setReceiptTab] = useState<StaffTableTab | null>(null);

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [payload, board] = await Promise.all([
        api<StaffTableTabsPayload>(`/v1/staff/tables/${tableId}/tabs`),
        api<{ orders: StaffOrder[] }>("/v1/staff/orders").catch(() => ({ orders: [] as StaffOrder[] })),
      ]);
      setRaw(payload);
      setBoardOrders(board.orders);
      setSelectedId((cur) => {
        if (cur && payload.tabs.some((t) => t.id === cur)) return cur;
        return payload.tabs[0]?.id ?? null;
      });
      setError(null);
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar as comandas.");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const data = useMemo(
    () => (raw ? mergeOrders(raw, boardOrders, overlay) : null),
    [raw, boardOrders, overlay],
  );
  const selected: StaffTableTab | undefined = data?.tabs.find((t) => t.id === selectedId);
  const openCount = data?.table.openTabCount ?? 0;
  const pin = data?.table.pinDisplay ?? null;
  const unassigned = data?.unassignedOrders ?? [];

  async function closeTab(tabId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/staff/tabs/${tabId}/close`, { method: "POST" });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fechar a comanda.");
    } finally {
      setBusy(false);
    }
  }

  async function closeTable() {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/staff/tables/${tableId}/close`, { method: "POST" });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível encerrar a mesa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-table-title"
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="eyebrow">Contas da mesa</p>
        <h2 id="staff-table-title" className="mt-2 font-serif text-2xl">
          {tableLabel}
        </h2>
        {pin ? (
          <div className="mt-3 rounded-2xl border border-chili/30 bg-paper-2 px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">PIN da mesa</p>
            <p className="mt-1 font-serif text-4xl tracking-[0.3em] text-chili">{pin}</p>
            <p className="mt-1 text-xs text-ink-soft">Passe este código para o cliente entrar em /entrar.</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Ainda sem PIN. Abra uma comanda ou gere o QR — o código aparece aqui para você passar ao cliente.
          </p>
        )}
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
        {loading ? (
          <p className="py-10 text-center text-ink-soft">Carregando…</p>
        ) : (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {!data || data.tabs.length === 0 ? (
              <p className="text-sm text-ink-soft">Nenhuma comanda nesta mesa ainda.</p>
            ) : (
              <ul className="space-y-2">
                {data.tabs.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                        selectedId === t.id ? "border-chili/50 bg-paper-2" : "border-line bg-card"
                      }`}
                    >
                      <span>
                        <span className="font-medium">{t.guestName}</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {t.guestPhoneMasked}
                          {t.status === "closed" ? " · fechada" : ""}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular-nums text-chili">
                        {formatBrlFromCents(t.totalCents)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {unassigned.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 p-3">
                <p className="text-sm font-medium">Pedidos nesta mesa (sem comanda)</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Ainda não estão na conta de ninguém. Lance pela comanda da pessoa para aparecer na parcial.
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {unassigned.map((order) => (
                    <li key={order.id}>
                      <p className="text-xs uppercase tracking-wide text-ink-soft">{order.status}</p>
                      {order.items.map((item) => (
                        <p key={item.id}>
                          {item.qty}× {item.name}
                        </p>
                      ))}
                      <p className="tabular-nums text-chili">{formatBrlFromCents(order.totalCents)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {openingTab ? (
              <StaffOpenTabForm
                tableId={tableId}
                busy={busy}
                onCancel={() => setOpeningTab(false)}
                onBusy={setBusy}
                onError={setError}
                onCreated={(tabId) => {
                  setOpeningTab(false);
                  setSelectedId(tabId);
                  void load();
                  onChanged();
                }}
              />
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpeningTab(true)}
                className="btn-secondary mt-4 w-full text-sm"
              >
                Abrir comanda
              </button>
            )}
            {selected ? (
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{selected.guestName}</p>
                    <p className="text-xs text-ink-soft">{selected.guestPhoneMasked}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary shrink-0 !px-3 !py-1.5 text-sm"
                    onClick={() => setReceiptTab(selected)}
                  >
                    Imprimir
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-chili/25 bg-chili/5 px-4 py-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {selected.status === "open" ? "A receber" : "Total da comanda"}
                  </p>
                  <p className="mt-1 font-serif text-4xl tabular-nums tracking-tight text-chili">
                    {formatBrlFromCents(selected.totalCents)}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {selected.orders.filter((o) => o.status !== "cancelled").length}{" "}
                    {selected.orders.filter((o) => o.status !== "cancelled").length === 1
                      ? "pedido"
                      : "pedidos"}
                    {selected.status === "closed" ? " · fechada" : ""}
                  </p>
                </div>

                {selected.orders.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">Nenhum pedido nesta comanda ainda.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {selected.orders.map((order) => (
                      <li key={order.id} className="text-sm">
                        <p className="text-xs uppercase tracking-wide text-ink-soft">{order.status}</p>
                        {order.items.map((item) => (
                          <p key={item.id} className="flex justify-between gap-2">
                            <span>
                              {item.qty}× {item.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-ink-soft">
                              {formatBrlFromCents(item.unitPriceCents * item.qty)}
                            </span>
                          </p>
                        ))}
                        <p className="mt-0.5 text-right tabular-nums text-chili">
                          {formatBrlFromCents(order.totalCents)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {selected.status === "open" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAddingTab(selected)}
                    className="btn-primary mt-4 w-full !py-2 text-sm"
                  >
                    Adicionar pedido
                  </button>
                ) : null}
                {selected.status === "open" && canClose ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void closeTab(selected.id)}
                    className="btn-secondary mt-3 w-full text-sm"
                  >
                    Receber {formatBrlFromCents(selected.totalCents)} e fechar comanda
                  </button>
                ) : selected.status === "open" ? (
                  <p className="mt-3 text-sm text-ink-soft">Peça ao caixa para encerrar esta comanda.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onGenerateQr} className="btn-secondary text-sm">
            Novo QR
          </button>
          {canClose ? (
            <button
              type="button"
              disabled={busy || openCount > 0}
              onClick={() => void closeTable()}
              className="btn-secondary text-sm disabled:opacity-50"
              title={openCount > 0 ? "Feche todas as comandas primeiro" : undefined}
            >
              Encerrar mesa
            </button>
          ) : (
            <p className="self-center text-sm text-ink-soft">Só o caixa encerra a mesa.</p>
          )}
          <button type="button" onClick={onClose} className="btn-primary !py-2 text-sm">
            Fechar
          </button>
        </div>
      </div>
      {addingTab?.status === "open" ? (
        <StaffAddOrderDialog
          tableId={tableId}
          tableLabel={tableLabel}
          tabId={addingTab.id}
          guestName={addingTab.guestName}
          onClose={() => setAddingTab(null)}
          onCreated={(order) => {
            const tabId = addingTab.id;
            setAddingTab(null);
            setOverlay((cur) => ({
              ...cur,
              [tabId]: [order, ...(cur[tabId] ?? []).filter((o) => o.id !== order.id)],
            }));
            void load();
            onChanged();
          }}
        />
      ) : null}
      {receiptTab ? (
        <StaffTabReceipt
          venueName={venueName}
          tableLabel={tableLabel}
          tab={receiptTab}
          onClose={() => setReceiptTab(null)}
        />
      ) : null}
    </div>
  );
}

function StaffOpenTabForm({
  tableId,
  busy,
  onCancel,
  onBusy,
  onError,
  onCreated,
}: {
  tableId: string;
  busy: boolean;
  onCancel: () => void;
  onBusy: (v: boolean) => void;
  onError: (m: string | null) => void;
  onCreated: (tabId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneBlocked, setPhoneBlocked] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = openComandaSchema.safeParse({ name, phone });
    if (!parsed.success) {
      onError(parsed.error.issues[0]?.message ?? "Confira nome e telefone.");
      return;
    }
    onBusy(true);
    onError(null);
    setPhoneBlocked(false);
    try {
      const created = await api<{ id?: string; tab?: { id: string } }>(`/v1/staff/tables/${tableId}/tabs`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      onCreated(created.tab?.id ?? created.id ?? "");
    } catch (err) {
      const blocked = err instanceof ApiError && err.code === ERROR_CODES.TAB_ALREADY_OPEN;
      setPhoneBlocked(blocked);
      onError(
        blocked
          ? "Este telefone já tem uma comanda aberta. Feche a outra ou use outro número."
          : err instanceof ApiError
            ? err.message
            : "Não foi possível abrir a comanda.",
      );
    } finally {
      onBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 rounded-2xl border border-line bg-card p-3">
      <p className="text-sm font-medium">Nova comanda</p>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Nome</span>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Telefone</span>
        <PhoneField
          className={`field${phoneBlocked ? " border-chili" : ""}`}
          value={phone}
          onValueChange={(next) => {
            setPhone(next);
            if (phoneBlocked) {
              setPhoneBlocked(false);
              onError(null);
            }
          }}
          required
          aria-invalid={phoneBlocked}
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 text-sm">
          Cancelar
        </button>
        <button type="submit" disabled={busy} className="btn-primary flex-1 !py-2 text-sm">
          {busy ? "Abrindo…" : "Abrir"}
        </button>
      </div>
    </form>
  );
}
