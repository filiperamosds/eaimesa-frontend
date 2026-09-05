import type { PrintGroup, VenueModules } from "@eaimesa/shared";

export type Venue = {
  id: string;
  name: string;
  slug: string;
  publicId: string;
  plan: string;
  planKind?: string;
  planName?: string;
  subscriptionStatus: string;
  acceptsOrders: boolean;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  staffCanCloseTabs?: boolean;
  requireShiftOnOpenCash?: boolean;
  thermalAutoPrint?: boolean;
  catalogDark?: boolean;
  waiterCallEnabled?: boolean;
  waiterCallTtlMinutes?: number;
  /** Fatia 16 — módulos efetivos do venue (ADR-029). */
  modules?: VenueModules;
  /** Fatia 19 — vias da térmica por categoria (ADR-035). */
  printGroups?: PrintGroup[];
  representative?: {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    postalCode?: string;
    addressNumber?: string;
  } | null;
};

export type Session = {
  role: "owner" | "staff";
  account: { id: string; email: string };
  venue: Venue;
  member?: {
    id: string;
    name: string;
    role?: "staff" | "cashier" | "panel";
    categoryIds?: string[];
    printViaGroups?: boolean;
  };
};

export type LoginResponse = Session & {
  redirectPath: string;
};

export type RegisterResponse =
  | (LoginResponse & { needsEmailVerification?: false })
  | {
      needsEmailVerification: true;
      email: string;
      message?: string;
    };

export type StaffInvitePreview = {
  email: string;
  name: string;
  venueName: string;
  role: "staff" | "cashier" | "panel";
  roleLabel?: string;
  expiresAt?: string | null;
};

export type CatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  offerPriceCents?: number | null;
  sortOrder: number;
  active: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  items: CatalogItem[];
};

export type HappyHourWindow = {
  id?: string;
  name: string | null;
  days: number[];
  startsAt: string;
  endsAt: string;
  items: { catalogItemId: string; priceCents: number }[];
};

export type PublicMenu = {
  venue: {
    name: string;
    slug: string;
    subscriptionStatus: string;
    plan?: string;
    planKind?: string;
    acceptsOrders: boolean;
    /** Plano Cardápio — chamar garçom (ADR-026). Ausente = tentar presença se houver ?mesa=. */
    waiterCallEnabled?: boolean;
    waiterCallTtlMinutes?: number;
    catalogDark?: boolean;
  };
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      priceCents: number;
      listPriceCents?: number;
      promo?: "offer" | "happy_hour" | null;
      maxNoteLength: number;
    }[];
  }[];
};

export type WaiterCall = {
  id: string;
  tableId: string;
  tableLabel: string;
  createdAt: string;
  status: "open" | "acked" | "expired";
};

export type PresenceSession = {
  tableLabel: string;
  expiresAt: string;
  expiresInSeconds?: number;
  /** Chamado `open` desta mesa; `null` depois do ack (EAI-5). */
  waiterCall?: { id: string; status: WaiterCall["status"]; createdAt: string } | null;
};

export type OrderStatus = "pending" | "accepted" | "preparing" | "delivered" | "cancelled";

export type VenueTable = {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
  /** Código opaco no QR `?mesa=` (ADR-026). */
  menuCode?: string | null;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role?: "staff" | "cashier" | "panel";
  categoryIds?: string[];
  printViaGroups?: boolean;
  active: boolean;
  invitePending?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffSession = Session;

export type StaffTableOpenTab = {
  id: string;
  guestName: string;
  guestPhoneMasked: string;
};

export type StaffTable = {
  id: string;
  label: string;
  sortOrder: number;
  sessionOpen: boolean;
  claimPending: boolean;
  openTabCount: number;
  openTabs: StaffTableOpenTab[];
  pinDisplay?: string | null;
};

export type ClaimResponse = {
  claimId: string;
  tableId: string;
  tableLabel: string;
  claimUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
  pinDisplay?: string | null;
};

export type JoinTabResponse = {
  tableLabel: string;
  slug: string;
  needsProfile: boolean;
  redirectPath: string;
};

export type GuestTab = {
  tabId: string | null;
  status: "open" | "closed";
  needsProfile: boolean;
  guestName: string | null;
  tableLabel: string;
  pinDisplay: string | null;
  slug: string;
  venueName: string;
  expiresAt: string;
};

export type OpenComandaResponse = {
  tabId: string;
  guestName: string;
  tableLabel: string;
  slug: string;
  needsProfile: boolean;
  redirectPath: string;
};

export type StaffTabOrder = StaffOrder;

export type StaffTableTab = {
  id: string;
  guestName: string;
  guestPhoneMasked: string;
  status: "open" | "closed";
  createdAt: string;
  totalCents: number;
  serviceFeePercent?: number;
  serviceFeeCents?: number;
  dueCents?: number;
  orders: StaffTabOrder[];
};

/** Cupom da comanda na fila do Kanban (ADR-041). */
export type TabReceiptPrintJob = {
  id: string;
  kind: "tab_receipt";
  status: "pending" | "printing" | "printed" | "failed" | "expired";
  createdAt: string | null;
  printedAt?: string | null;
  venueName: string;
  tableLabel: string;
  tab: StaffTableTab;
};

export type StaffTableTabsPayload = {
  table: {
    id: string;
    label: string;
    sessionOpen: boolean;
    openTabCount: number;
    pinDisplay?: string | null;
  };
  tabs: StaffTableTab[];
  unassignedOrders?: StaffOrder[];
};

export type StaffOrder = {
  id: string;
  status: OrderStatus;
  source: "counter" | "guest";
  tableId: string | null;
  tableLabel: string;
  tabId: string | null;
  guestName: string | null;
  note: string | null;
  printedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalCents: number;
  items: {
    id: string;
    catalogItemId: string | null;
    categoryId?: string | null;
    name: string;
    unitPriceCents: number;
    qty: number;
    note: string | null;
  }[];
};

export type GuestOrder = StaffOrder;

export type GuestOrdersPayload = {
  orders: GuestOrder[];
  totalCents: number;
  serviceFeePercent?: number;
  serviceFeeCents?: number;
  dueCents?: number;
};
