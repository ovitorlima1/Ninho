/**
 * Cliente das listas de presentes: as rotas da mãe (/api/me/lists, /api/me/pix)
 * e as do convidado (/api/lists/:token), que não usam sessão.
 */
import { customFetch } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ME = `${BASE}/api/me`;
const PUBLIC = `${BASE}/api/lists`;

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export type GiftTemplate = "cha-de-fralda" | "cha-de-bebe" | "em-branco";
export type GiftItemKind = "money" | "units" | "single";
export type GiftItemState = "open" | "progress" | "complete" | "whole";
export type PledgeKind = "money" | "units" | "whole";
export type PledgeStatus = "promised" | "confirmed" | "cancelled";
export type WholeMode = "bring" | "pix";

export interface ItemSummary {
  state: GiftItemState;
  goal: number;
  committed: number;
  confirmed: number;
  remaining: number;
  active: number;
}

// ─── Mãe ─────────────────────────────────────────────────────────────────────

export interface GiftListCard {
  id: number;
  name: string;
  template: GiftTemplate;
  eventDate: string | null;
  eventTime: string | null;
  eventPlace: string | null;
  message: string | null;
  itemCount: number;
  doneCount: number;
  pledgeCount: number;
}

export interface OwnerGiftItem {
  id: number;
  listId: number;
  name: string;
  kind: GiftItemKind;
  goalCents: number | null;
  goalUnits: number | null;
  unitLabel: string;
  referenceCents: number | null;
  note: string | null;
  similarOk: boolean;
  storeUrl: string | null;
  allowWhole: boolean;
  hidden: boolean;
  sortOrder: number;
  summary: ItemSummary;
}

export interface OwnerPledge {
  id: number;
  itemId: number;
  kind: PledgeKind;
  amountCents: number | null;
  units: number | null;
  wholeMode: WholeMode | null;
  guestName: string | null;
  showName: boolean;
  guestSaysPaid: boolean;
  status: PledgeStatus;
  code: string;
  createdAt: string;
  confirmedAt: string | null;
}

export interface OwnerGiftList {
  list: {
    id: number;
    name: string;
    template: GiftTemplate;
    eventDate: string | null;
    eventTime: string | null;
    eventPlace: string | null;
    message: string | null;
    token: string;
    items: OwnerGiftItem[];
  };
  pledges: OwnerPledge[];
  pixReady: boolean;
  itemLimit: number;
}

export interface GiftListInput {
  name?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  eventPlace?: string | null;
  message?: string | null;
}

export interface GiftItemInput {
  name: string;
  kind: GiftItemKind;
  goalCents?: number | null;
  goalUnits?: number | null;
  unitLabel?: string;
  referenceCents?: number | null;
  note?: string | null;
  similarOk?: boolean;
  storeUrl?: string | null;
  allowWhole?: boolean;
  hidden?: boolean;
}

export interface PixAccount {
  key: string;
  keyType: "cpf" | "cnpj" | "phone" | "email" | "random";
  keyMasked: string;
  recipientName: string;
  city: string;
}

export const fetchGiftLists = () => customFetch<{ lists: GiftListCard[]; limit: number }>(`${ME}/lists`);
export const createGiftList = (data: { template: GiftTemplate; name?: string }) => customFetch<{ id: number }>(`${ME}/lists`, json("POST", data));
export const fetchGiftList = (id: number) => customFetch<OwnerGiftList>(`${ME}/lists/${id}`);
export const updateGiftList = (id: number, data: GiftListInput) => customFetch<{ id: number }>(`${ME}/lists/${id}`, json("PATCH", data));
export const deleteGiftList = (id: number) => customFetch<void>(`${ME}/lists/${id}`, json("DELETE"));
export const createGiftItem = (listId: number, data: GiftItemInput) => customFetch<{ item: OwnerGiftItem }>(`${ME}/lists/${listId}/items`, json("POST", data));
export const updateGiftItem = (listId: number, itemId: number, data: Partial<GiftItemInput>) =>
  customFetch<{ item: OwnerGiftItem }>(`${ME}/lists/${listId}/items/${itemId}`, json("PATCH", data));
export const deleteGiftItem = (listId: number, itemId: number) => customFetch<void>(`${ME}/lists/${listId}/items/${itemId}`, json("DELETE"));
export const reorderGiftItems = (listId: number, ids: number[]) => customFetch<void>(`${ME}/lists/${listId}/items/order`, json("PUT", { ids }));
export const updatePledgeStatus = (listId: number, pledgeId: number, status: PledgeStatus) =>
  customFetch<{ pledge: OwnerPledge }>(`${ME}/lists/${listId}/pledges/${pledgeId}`, json("PATCH", { status }));

export const fetchPixAccount = () => customFetch<{ pix: PixAccount | null }>(`${ME}/pix`);
export const savePixAccount = (data: { key: string; recipientName: string; city: string }) => customFetch<{ pix: PixAccount }>(`${ME}/pix`, json("PUT", data));
export const deletePixAccount = () => customFetch<void>(`${ME}/pix`, json("DELETE"));
export const fetchPixTest = () => customFetch<{ payload: string; amountCents: number; recipientName: string }>(`${ME}/pix/test`);

// ─── Convidado ───────────────────────────────────────────────────────────────

export interface PublicGiftListItem {
  id: number;
  name: string;
  kind: GiftItemKind;
  unitLabel: string;
  referenceCents: number | null;
  note: string | null;
  similarOk: boolean;
  storeUrl: string | null;
  storeDomain: string | null;
  state: GiftItemState;
  goal: number;
  committed: number;
  confirmed: number;
  remaining: number;
  canWhole: boolean;
  wholeBy: string | null;
}

export interface PublicGiftList {
  name: string;
  ownerName: string | null;
  eventDate: string | null;
  eventTime: string | null;
  eventPlace: string | null;
  message: string | null;
  pixReady: boolean;
  items: PublicGiftListItem[];
}

export interface PixCharge {
  payload: string;
  amountCents: number;
  recipientName: string;
  keyMasked: string;
}

export interface GuestPledge {
  id: number;
  itemId: number;
  itemName: string;
  kind: PledgeKind;
  amountCents: number | null;
  units: number | null;
  wholeMode: WholeMode | null;
  guestName: string | null;
  showName: boolean;
  guestSaysPaid: boolean;
  status: PledgeStatus;
  createdAt: string;
  pix: PixCharge | null;
  manageToken?: string;
}

export interface PledgeInput {
  itemId: number;
  kind: PledgeKind;
  amountCents?: number;
  units?: number;
  wholeMode?: WholeMode;
  guestName?: string | null;
  showName?: boolean;
}

export const fetchPublicList = (token: string) => customFetch<PublicGiftList>(`${PUBLIC}/${token}`);
export const createPledge = (token: string, data: PledgeInput) =>
  customFetch<{ pledge: GuestPledge; manageToken: string }>(`${PUBLIC}/${token}/pledges`, json("POST", data));
export const lookupPledges = (token: string, tokens: string[]) =>
  customFetch<{ pledges: GuestPledge[] }>(`${PUBLIC}/${token}/pledges/lookup`, json("POST", { tokens }));
export const markPledgePaid = (token: string, manageToken: string, guestSaysPaid: boolean) =>
  customFetch<void>(`${PUBLIC}/${token}/pledges/mine`, json("PATCH", { manageToken, guestSaysPaid }));
export const cancelPledge = (token: string, manageToken: string) =>
  customFetch<void>(`${PUBLIC}/${token}/pledges/cancel`, json("POST", { manageToken }));
