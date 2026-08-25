/**
 * Ninho API client — typed wrappers over customFetch.
 * All paths use BASE_URL so they work under the Replit proxy.
 */
import { customFetch } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/me`;
const AUTH_API = `${BASE}/api/auth`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus = "A comprar" | "Comprado" | "Ganhei";
export type CategoryKey = "Roupas" | "Higiene" | "Alimentação" | "Acessórios";

export interface ServerProfile {
  id: number;
  userId: string;
  displayName: string | null;
  dueDate: string | null;
  city: string | null;
  babyName: string | null;
  hospital: string | null;
  supportPerson: string | null;
  personalNotes: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerChecklistItem {
  id: number;
  userId: string;
  name: string;
  category: string;
  group: string;
  qty: number;
  status: string;
  price: string; // numeric as string from DB
  essential: boolean;
  recommendationId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMilestone {
  id: number;
  userId: string;
  week: number;
  title: string;
  note: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface ServerBudgetCategory {
  id: number;
  userId: string;
  category: string;
  planned: string; // numeric as string
  createdAt: string;
  updatedAt: string;
}

export type GiftReservationStatus = "vou presentear" | "presenteado";
export interface Workspace {
  profile: ServerProfile;
  items: ServerChecklistItem[];
  milestones: ServerMilestone[];
  budget: ServerBudgetCategory[];
  giftReservations: ServerGiftReservation[];
}

export interface PublicGiftItem {
  id: number;
  name: string;
  category: string;
  qty: number;
  reserved: boolean;
  reservation: { status: GiftReservationStatus; guestName: string | null } | null;
}
export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser | null;
}

export async function getSession(): Promise<AuthSession> {
  return customFetch<AuthSession>(`${AUTH_API}/session`);
}

export async function login(data: { email: string; password: string }): Promise<AuthSession> {
  return customFetch<AuthSession>(`${AUTH_API}/login`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: { email: string; password: string }): Promise<AuthSession> {
  return customFetch<AuthSession>(`${AUTH_API}/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  return customFetch<void>(`${AUTH_API}/logout`, { method: "POST" });
}

export async function requestPasswordReset(data: { email: string }): Promise<{ message: string }> {
  return customFetch<{ message: string }>(`${AUTH_API}/password-reset/request`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: { token: string; password: string }): Promise<{ message: string }> {
  return customFetch<{ message: string }>(`${AUTH_API}/password-reset/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export async function fetchWorkspace(): Promise<Workspace> {
  return customFetch<Workspace>(`${API}/workspace`);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  displayName?: string | null;
  dueDate?: string | null;
  city?: string | null;
  babyName?: string | null;
  hospital?: string | null;
  supportPerson?: string | null;
  personalNotes?: string | null;
  onboardingComplete?: boolean;
}

export async function updateProfile(data: UpdateProfileInput): Promise<ServerProfile> {
  return customFetch<ServerProfile>(`${API}/profile`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export interface CreateItemInput {
  name: string;
  category?: CategoryKey;
  group?: string;
  qty?: number;
  price?: number;
  recommendationId?: string | null;
}

export async function createChecklistItem(data: CreateItemInput): Promise<ServerChecklistItem> {
  return customFetch<ServerChecklistItem>(`${API}/checklist`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface UpdateItemInput {
  name?: string;
  category?: CategoryKey;
  status?: ItemStatus;
  qty?: number;
  price?: number;
  recommendationId?: string | null;
}

export async function updateChecklistItem(
  id: number,
  data: UpdateItemInput,
): Promise<ServerChecklistItem> {
  return customFetch<ServerChecklistItem>(`${API}/checklist/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteChecklistItem(id: number): Promise<void> {
  return customFetch<void>(`${API}/checklist/${id}`, { method: "DELETE" });
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function toggleMilestone(
  id: number,
  completed: boolean,
): Promise<ServerMilestone> {
  return customFetch<ServerMilestone>(`${API}/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface BudgetInput {
  categories: Array<{ category: string; planned: number }>;
}

export async function updateBudget(data: BudgetInput): Promise<ServerBudgetCategory[]> {
  return customFetch<ServerBudgetCategory[]>(`${API}/budget`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getGiftShare(): Promise<ServerGiftShare | null> {
  return customFetch<ServerGiftShare | null>(`${API}/share`);
}

export async function deleteGiftReservation(id: number): Promise<void> {
  return customFetch<void>(`${API}/gift-reservations/${id}`, { method: "DELETE" });
}

export async function fetchPublicGiftList(token: string): Promise<PublicGiftList> {
  return customFetch<PublicGiftList>(`${BASE}/api/gift/${encodeURIComponent(token)}`);
}

export async function reservePublicGift(
  token: string,
  data: { itemId: number; guestName?: string | null; status: GiftReservationStatus },
): Promise<{ item: PublicGiftItem }> {
  return customFetch<{ item: PublicGiftItem }>(`${BASE}/api/gift/${encodeURIComponent(token)}/reservations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGiftReservation(
  id: number,
  data: { guestName?: string | null; status?: GiftReservationStatus },
): Promise<ServerGiftReservation> {
  return customFetch<ServerGiftReservation>(`${API}/gift-reservations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function createGiftShare(): Promise<ServerGiftShare> {
  return customFetch<ServerGiftShare>(`${API}/share`, { method: "POST" });
}

export async function revokeGiftShare(): Promise<void> {
  return customFetch<void>(`${API}/share`, { method: "DELETE" });
}

export interface PublicGiftList {
  ownerName: string | null;
  babyName: string | null;
  items: PublicGiftItem[];
}

export interface ServerGiftShare {
  id: number;
  userId: string;
  token: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface ServerGiftReservation {
  id: number;
  userId: string;
  checklistItemId: number;
  shareLinkId: number;
  guestName: string | null;
  status: GiftReservationStatus;
  createdAt: string;
  updatedAt: string;
}
