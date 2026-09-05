"use client";

import {
  ERROR_CODES,
  formatBrlFromCents,
  GUEST_ORDER_STATUS_LABEL,
  openComandaSchema,
  serviceFeeCents,
  tabDueCents,
} from "@eaimesa/shared";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffOrder, StaffTable, StaffTableTab, StaffTableTabsPayload } from "../lib/types";
import { PhoneField } from "./masked-fields";
import { StaffAddOrderDialog } from "./staff-add-order-dialog";
import { StaffCloseTabDialog } from "./staff-close-tab-dialog";
import { StaffTabReceipt } from "./staff-tab-receipt";

type Props = {
  tableId: string;
  tableLabel: string;
  venueName: string;
  canClose: boolean;
  cashBlocked?: boolean;
  tables: StaffTable[];
  onClose: () => void;
  onGenerateQr: () => void;
  onChanged: () => void;
  onMoved: (next: { tableId: string; tableLabel: string }) => void;
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
    const percent = tab.serviceFeePercent ?? 0;
    const fee = serviceFeeCents(totalCents, percent);
    return {
      ...tab,
      orders,
      totalCents,
      serviceFeePercent: percent,
      serviceFeeCents: fee,
      dueCents: tabDueCents(totalCents, percent),
    };
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
  cashBlocked = false,
  tables,
  onClose,
  onGenerateQr,
  onChanged,
  onMoved,
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
  const [closingTab, setClosingTab] = useState<StaffTableTab | null>(null);
  const [destId, setDestId] = useState("");
  const [movingTable, setMovingTable] = useState(false);

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
      setSelectedId((cur) => (cur && payload.tabs.some((t) => t.id === cur) ? cur : null));
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
    setDestId("");
    setMovingTable(false);
    setOpeningTab(false);
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
  const openCount = data?.table.openTabCount ?? 0;
  const pin = data?.table.pinDisplay ?? null;
  const unassigned = data?.unassignedOrders ?? [];
  const freeTables = tables.filter((t) => t.id !== tableId && !t.sessionOpen);
  const sessionOpen = Boolean(data?.table.sessionOpen || pin);
  const selected = data?.tabs.find((t) => t.id === selectedId) ?? null;
  const canEndTable = canClose && sessionOpen && openCount === 0;
  const showOpenTabBtn = !selected && !openingTab;
  const showQrBtn = !selected;
  const fecharFullRow =
    (Number(showOpenTabBtn) + Number(showQrBtn) + Number(canEndTable) + 1) % 2 === 1;

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

  async function transferTable() {
    if (!destId) return;
    setBusy(true);
    setError(null);
    try {
      const moved = await api<{ tableId: string; tableLabel: string }>(`/v1/staff/tables/${tableId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ toTableId: destId }),
      });
      setDestId("");
      setMovingTable(false);
      onMoved(moved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar de mesa.");
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
        {selected ? (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="btn-secondary mt-3 gap-1.5 !px-3 !py-1.5 text-sm"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.78 4.22a.75.75 0 0 1 0 1.06L8.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
            Comandas
          </button>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 id="staff-table-title" className="font-serif text-2xl">
            {tableLabel}
          </h2>
          {!selected && sessionOpen ? (
            <button
              type="button"
              aria-expanded={movingTable}
              onClick={() => setMovingTable((v) => !v)}
              className="btn-secondary shrink-0 !px-3 !py-1.5 text-sm"
            >
              Trocar
            </button>
          ) : null}
        </div>
        {selected ? (
          <p className="mt-1 text-sm text-ink-soft">
            {selected.guestName}
            {selected.status === "closed" ? " · fechada" : ""}
          </p>
        ) : null}
        {!selected && pin ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-chili/25 bg-paper-2 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">PIN</span>
            <span className="font-serif text-xl tracking-[0.28em] text-chili">{pin}</span>
          </div>
        ) : null}
        {!selected && !pin ? (
          <p className="mt-3 text-sm text-ink-soft">
            Ainda sem PIN. Abra uma comanda ou gere o QR — o código aparece aqui para você passar ao cliente.
          </p>
        ) : null}
        {!selected && movingTable && sessionOpen ? (
          <div className="mt-3 rounded-2xl border border-line p-3">
            <p className="text-sm font-medium">Trocar mesa</p>
            <p className="mt-1 text-xs text-ink-soft">
              Leva PIN e comandas para outra mesa livre. O cliente continua na mesma sessão.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                className="field flex-1 text-sm"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                disabled={busy || freeTables.length === 0}
              >
                <option value="">
                  {freeTables.length === 0 ? "Nenhuma mesa livre" : "Escolher mesa"}
                </option>
                {freeTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !destId}
                onClick={() => void transferTable()}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Transferir
              </button>
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
        {cashBlocked ? (
          <p className="mt-3 rounded-2xl border border-chili/30 bg-chili/5 px-3 py-2 text-sm text-chili">
            Caixa fechado. Abra o turno para gerar QR, abrir comanda ou lançar pedido.
          </p>
        ) : null}
        {loading ? (
          <p className="py-10 text-center text-ink-soft">Carregando…</p>
        ) : (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {selected ? (
              <StaffTabDetail
                tab={selected}
                busy={busy}
                cashBlocked={cashBlocked}
                canClose={canClose}
                onPrint={() => setReceiptTab(selected)}
                onAddOrder={() => setAddingTab(selected)}
                onReceive={() => setClosingTab(selected)}
              />
            ) : (
              <>
                {!data || data.tabs.length === 0 ? (
                  <p className="text-sm text-ink-soft">Nenhuma comanda nesta mesa ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.tabs.map((t) => {
                      const due = t.dueCents ?? tabDueCents(t.totalCents, t.serviceFeePercent ?? 0);
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(t.id);
                              setMovingTable(false);
                              setOpeningTab(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card px-3 py-3 text-left"
                          >
                            <span>
                              <span className="font-medium">{t.guestName}</span>
                              <span className="mt-0.5 block text-xs text-ink-soft">
                                {t.guestPhoneMasked}
                                {t.status === "closed" ? " · fechada" : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-medium tabular-nums text-chili">
                              {formatBrlFromCents(due)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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
                          <p className="text-xs uppercase tracking-wide text-ink-soft">
                            {GUEST_ORDER_STATUS_LABEL[order.status]}
                          </p>
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
                    onCreated={() => {
                      setOpeningTab(false);
                      void load();
                      onChanged();
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
          {showOpenTabBtn ? (
            <button
              type="button"
              disabled={busy || cashBlocked}
              onClick={() => setOpeningTab(true)}
              className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-50"
            >
              Abrir comanda
            </button>
          ) : null}
          {showQrBtn ? (
            <button
              type="button"
              onClick={onGenerateQr}
              disabled={cashBlocked}
              className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-50"
              title={cashBlocked ? "Abra o caixa para gerar o QR" : undefined}
            >
              Novo QR
            </button>
          ) : null}
          {canEndTable ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void closeTable()}
              className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-50"
            >
              Encerrar mesa
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`btn-primary w-full !py-2.5 text-sm${fecharFullRow ? " col-span-2" : ""}`}
          >
            Fechar
          </button>
        </div>
        {!canClose && sessionOpen && openCount === 0 ? (
          <p className="mt-2 text-center text-xs text-ink-soft">Só o caixa encerra a mesa.</p>
        ) : null}
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
      {closingTab ? (
        <StaffCloseTabDialog
          tabId={closingTab.id}
          guestName={closingTab.guestName}
          onCancel={() => setClosingTab(null)}
          onDone={() => {
            setClosingTab(null);
            void load();
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function StaffTabDetail({
  tab,
  busy,
  cashBlocked,
  canClose,
  onPrint,
  onAddOrder,
  onReceive,
}: {
  tab: StaffTableTab;
  busy: boolean;
  cashBlocked: boolean;
  canClose: boolean;
  onPrint: () => void;
  onAddOrder: () => void;
  onReceive: () => void;
}) {
  const due = tab.dueCents ?? tabDueCents(tab.totalCents, tab.serviceFeePercent ?? 0);
  const feeOn = (tab.serviceFeePercent ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {feeOn ? (
          <p className="text-xs text-ink-soft">
            Taxa {tab.serviceFeePercent}% · {formatBrlFromCents(tab.serviceFeeCents ?? 0)}
          </p>
        ) : (
          <span />
        )}
        <button type="button" className="btn-ghost !px-2 !py-1 text-sm" onClick={onPrint}>
          Imprimir
        </button>
      </div>
      {tab.orders.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum pedido nesta comanda ainda.</p>
      ) : (
        <ul className="space-y-3">
          {tab.orders.map((order) => (
            <li key={order.id} className="text-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                {GUEST_ORDER_STATUS_LABEL[order.status]}
              </p>
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
              <p className="mt-0.5 text-right tabular-nums text-chili">{formatBrlFromCents(order.totalCents)}</p>
            </li>
          ))}
        </ul>
      )}
      {tab.status === "open" ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || cashBlocked}
            onClick={onAddOrder}
            className="btn-primary w-full !py-2 text-sm disabled:opacity-50"
          >
            Adicionar pedido
          </button>
          {canClose ? (
            <button type="button" disabled={busy} onClick={onReceive} className="btn-secondary w-full text-sm">
              Receber {formatBrlFromCents(due)}
            </button>
          ) : (
            <p className="text-sm text-ink-soft">Peça ao caixa para encerrar esta comanda.</p>
          )}
        </div>
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
  onCreated: () => void;
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
      await api<{ id?: string; tab?: { id: string } }>(`/v1/staff/tables/${tableId}/tabs`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      onCreated();
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
