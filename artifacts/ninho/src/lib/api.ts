/**
 * Ninho API client — typed wrappers over customFetch.
 * All paths use BASE_URL so they work under the Replit proxy.
 */
import { customFetch } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/me`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus = "A comprar" | "Comprado" | "Ganhei";
export type CategoryKey = "Roupas" | "Higiene" | "Alimentação" | "Acessórios";

export interface ServerProfile {
  id: number;
  userId: string;
  displayName: string | null;
  dueDate: string | null;
  city: string | null;
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

export interface Workspace {
  profile: ServerProfile;
  items: ServerChecklistItem[];
  milestones: ServerMilestone[];
  budget: ServerBudgetCategory[];
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export async function fetchWorkspace(): Promise<Workspace> {
  return customFetch<Workspace>(`${API}/workspace`);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  displayName?: string;
  dueDate?: string | null;
  city?: string | null;
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
