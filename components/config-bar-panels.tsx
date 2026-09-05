"use client";

import { ERROR_CODES, planAllowsService, slugifyFromName, withSlugSuffix } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useMenuSlugFromName } from "../lib/menu-slug";
import { configureThermalPrinter, connectThermalPrinter, hasGrantedThermalPrinter } from "../lib/print-escpos";
import { setThermalAutoPrintEnabled } from "../lib/thermal-print-pref";
import type { CatalogCategory, Session, Venue } from "../lib/types";
import { PrintGroupsEditor, type DraftPrintGroup } from "./print-groups-editor";

export function ConfigBarPanels() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [service, setService] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [staffCanCloseTabs, setStaffCanCloseTabs] = useState(true);
  const [requireShiftOnOpenCash, setRequireShiftOnOpenCash] = useState(false);
  const [thermalPrint, setThermalPrint] = useState(false);
  const [printGroups, setPrintGroups] = useState<DraftPrintGroup[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [printerBusy, setPrinterBusy] = useState(false);
  const [printerReady, setPrinterReady] = useState(false);
  const [printerMsg, setPrinterMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const derivedSlug = useMenuSlugFromName(name, venue?.slug ?? null);
  const slug = venue && !nameTouched ? venue.slug : derivedSlug;

  useEffect(() => {
    void Promise.all([
      api<Session>("/v1/auth/me"),
      api<Venue>("/v1/owner/venue"),
      api<{ categories: CatalogCategory[] }>("/v1/owner/catalog").catch(() => ({ categories: [] })),
    ])
      .then(([session, v, catalog]) => {
        setService(planAllowsService(session.venue.planKind ?? session.venue.plan));
        setVenue(v);
        setName(v.name);
        setStaffCanCloseTabs(v.staffCanCloseTabs !== false);
        setRequireShiftOnOpenCash(v.requireShiftOnOpenCash === true);
        setThermalPrint(v.thermalAutoPrint === true);
        setThermalAutoPrintEnabled(v.thermalAutoPrint === true);
        setCategories(catalog.categories);
        setPrintGroups(
          (v.printGroups ?? []).map((g) => ({
            key: g.id,
            name: g.name,
            categoryIds: g.categoryIds,
          })),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  useEffect(() => {
    void hasGrantedThermalPrinter().then((ok) => setPrinterReady(ok));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      if (service && thermalPrint) {
        await connectThermalPrinter();
      }
      if (service) {
        for (const group of printGroups) {
          if (!group.name.trim()) {
            throw new Error("Dê um nome a cada grupo de impressão.");
          }
          if (group.categoryIds.length === 0) {
            throw new Error("Cada grupo de impressão precisa de ao menos uma categoria.");
          }
        }
      }

      let nextSlug = slug;
      let v: Venue | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const body: {
            name: string;
            slug: string;
            staffCanCloseTabs?: boolean;
            requireShiftOnOpenCash?: boolean;
            thermalAutoPrint?: boolean;
          } = {
            name,
            slug: nextSlug,
          };
          if (service) {
            body.staffCanCloseTabs = staffCanCloseTabs;
            body.requireShiftOnOpenCash = requireShiftOnOpenCash;
            body.thermalAutoPrint = thermalPrint;
          }
          v = await api<Venue>("/v1/owner/venue", {
            method: "PATCH",
            body: JSON.stringify(body),
          });
          break;
        } catch (err) {
          const taken = err instanceof ApiError && err.code === ERROR_CODES.SLUG_TAKEN;
          if (!taken || attempt === 7) throw err;
          nextSlug = withSlugSuffix(slugifyFromName(name), attempt + 2);
        }
      }
      if (!v) throw new Error("Não foi possível salvar.");
      if (service) {
        const saved = await api<{ groups: NonNullable<Venue["printGroups"]> }>("/v1/owner/print-groups", {
          method: "PUT",
          body: JSON.stringify({
            groups: printGroups.map((g) => ({
              name: g.name.trim(),
              categoryIds: g.categoryIds,
            })),
          }),
        });
        v = { ...v, printGroups: saved.groups };
        setPrintGroups(
          saved.groups.map((g) => ({
            key: g.id,
            name: g.name,
            categoryIds: g.categoryIds,
          })),
        );
      }
      setVenue(v);
      setName(v.name);
      setNameTouched(false);
      if (service) {
        setStaffCanCloseTabs(v.staffCanCloseTabs !== false);
        setRequireShiftOnOpenCash(v.requireShiftOnOpenCash === true);
        setThermalPrint(v.thermalAutoPrint === true);
      }
      if (service) setThermalAutoPrintEnabled(thermalPrint);
      if (service) setPrinterReady(await hasGrantedThermalPrinter());
      setMsg("Salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  async function configurePrinter() {
    setError(null);
    setMsg(null);
    setPrinterMsg(null);
    setPrinterBusy(true);
    try {
      await configureThermalPrinter();
      setPrinterReady(true);
      setPrinterMsg("Impressora configurada neste Chrome.");
    } catch (err) {
      setPrinterReady(await hasGrantedThermalPrinter());
      setError(err instanceof Error ? err.message : "Não foi possível configurar a impressora.");
    } finally {
      setPrinterBusy(false);
    }
  }

  if (!venue && !error) return <p className="text-ink-soft">Carregando…</p>;
  if (!venue) return <p className="text-sm text-chili">{error}</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl">Meu estabelecimento</h2>
      <form onSubmit={(e) => void save(e)} className="mt-8 max-w-lg space-y-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            className="field"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL do cardápio</span>
          <input value={slug} className="field" disabled readOnly />
          <p className="mt-1 text-xs text-ink-soft">
            Cardápio em /{slug}. Se o caminho já existir, o sistema acrescenta um número.
          </p>
        </label>

        {service ? (
          <div className="surface space-y-3 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-chili"
                checked={thermalPrint}
                onChange={(e) => setThermalPrint(e.target.checked)}
              />
              <span>
                <span className="block font-medium">Imprimir pedidos novos na térmica</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  Via dos pedidos novos no Kanban e cupom de conferência, neste Chrome, sem a caixa de
                  imprimir do sistema. Desligada, o pedido não fica na fila para imprimir depois.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:pl-7">
              <button
                type="button"
                className="btn-secondary !py-1.5 text-sm"
                disabled={printerBusy || pending}
                onClick={() => void configurePrinter()}
              >
                {printerBusy ? "Abrindo…" : "Configurar impressora"}
              </button>
              {printerReady ? (
                <span className="text-xs text-sage">Autorizada neste Chrome.</span>
              ) : (
                <span className="text-xs text-ink-soft">Nenhuma impressora neste Chrome.</span>
              )}
            </div>
            {printerMsg ? <p className="text-sm text-sage sm:pl-7">{printerMsg}</p> : null}
          </div>
        ) : null}

        {service ? (
          <PrintGroupsEditor categories={categories} groups={printGroups} onChange={setPrintGroups} />
        ) : null}

        {service ? (
          <label className="surface flex cursor-pointer items-start gap-3 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-chili"
              checked={staffCanCloseTabs}
              onChange={(e) => setStaffCanCloseTabs(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Garçom pode encerrar comanda e mesa</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Regras do salão. O caixa não é afetado — ele sempre pode fechar comanda e mesa.
              </span>
            </span>
          </label>
        ) : null}

        {service ? (
          <label className="surface flex cursor-pointer items-start gap-3 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-chili"
              checked={requireShiftOnOpenCash}
              onChange={(e) => setRequireShiftOnOpenCash(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Exigir escala ao abrir o caixa</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Na abertura do caixa, escolher quem está no turno (garçom e caixa). Quem ficar de fora
                fica inativo e não consegue entrar. O painel Kanban não entra na escala.
              </span>
            </span>
          </label>
        ) : null}

        {error ? <p className="text-sm text-chili">{error}</p> : null}
        {msg ? <p className="text-sm text-sage">{msg}</p> : null}
        <button type="submit" disabled={pending || printerBusy} className="btn-primary !py-2">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
