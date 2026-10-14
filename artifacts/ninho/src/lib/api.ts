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
export type ChecklistTemplate = "enxoval" | "mala-maternidade" | "quarto-do-bebe" | "em-branco";

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

/** Uma lista do Enxoval (Enxoval do bebê, Mala da maternidade…). */
export interface ServerChecklist {
  id: number;
  userId: string;
  name: string;
  suggestionsNoticeDismissed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Categoria de uma lista; `planned` é o valor do Orçamento. */
export interface ServerCategory {
  id: number;
  userId: string;
  listId: number;
  name: string;
  icon: string;
  tone: string;
  planned: string; // numeric as string
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerChecklistItem {
  id: number;
  userId: string;
  listId: number;
  categoryId: number;
  name: string;
  /** Nome da categoria, mantido pelo servidor. */
  category: string;
  group: string;
  qty: number;
  status: string;
  price: string; // numeric as string from DB
  essential: boolean;
  /** Veio pronto de um modelo e ainda não foi mexido. */
  suggested: boolean;
  recommendationId: string | null;
  /** Foto do produto: a chave de `/api/media/<chave>`. */
  photoKey: string | null;
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

export type GiftReservationStatus = "vou presentear" | "presenteado";
export interface Workspace {
  profile: ServerProfile;
  lists: ServerChecklist[];
  categories: ServerCategory[];
  items: ServerChecklistItem[];
  milestones: ServerMilestone[];
  giftReservations: ServerGiftReservation[];
}

export interface PublicGiftItem {
  id: number;
  name: string;
  category: string;
  categoryIcon: string | null;
  photoKey: string | null;
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

/** O cadastro não abre sessão: responde sempre a mesma mensagem, e o link do e-mail abre. */
export async function register(data: { email: string; password: string }): Promise<{ message: string }> {
  return customFetch<{ message: string }>(`${AUTH_API}/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(data: { token: string }): Promise<AuthSession> {
  return customFetch<AuthSession>(`${AUTH_API}/verify-email`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resendVerification(data: { email: string }): Promise<{ message: string }> {
  return customFetch<{ message: string }>(`${AUTH_API}/verify-email/resend`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  return customFetch<void>(`${AUTH_API}/logout`, { method: "POST" });
}

/** Encerra a conta em todos os aparelhos, inclusive este. */
export async function logoutEverywhere(): Promise<void> {
  return customFetch<void>(`${API}/sessions/revoke-all`, { method: "POST" });
}

/** Arquivo JSON com todos os dados da conta (baixado por link, com o cookie). */
export const EXPORT_DATA_URL = `${API}/export`;

/** Exclui a conta na hora. Exige a senha e a palavra EXCLUIR. */
export async function deleteAccount(data: { password: string; confirmation: string }): Promise<void> {
  return customFetch<void>(`${API}/account`, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
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
  /** Sem categoria só quando vem de uma inspiração: o servidor escolhe a de mesmo nome. */
  categoryId?: number;
  group?: string;
  qty?: number;
  price?: number;
  recommendationId?: string | null;
  /** "Desfazer" de uma remoção: religa a foto que o item tinha. */
  photoKey?: string;
}

export async function createChecklistItem(data: CreateItemInput): Promise<ServerChecklistItem> {
  return customFetch<ServerChecklistItem>(`${API}/checklist`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: number;
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

/** Envia a foto do produto: o corpo é o próprio arquivo, não JSON. */
export async function uploadChecklistItemPhoto(id: number, file: File): Promise<ServerChecklistItem> {
  return customFetch<ServerChecklistItem>(`${API}/checklist/${id}/photo`, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
}

export async function deleteChecklistItemPhoto(id: number): Promise<ServerChecklistItem> {
  return customFetch<ServerChecklistItem>(`${API}/checklist/${id}/photo`, { method: "DELETE" });
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
  categories: Array<{ categoryId: number; planned: number }>;
}

/** Devolve todas as categorias da conta, já com o valor planejado novo. */
export async function updateBudget(data: BudgetInput): Promise<ServerCategory[]> {
  return customFetch<ServerCategory[]>(`${API}/budget`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── Listas e categorias do Enxoval ───────────────────────────────────────────

export async function createChecklist(
  data: { template: ChecklistTemplate; name: string },
): Promise<{ list: ServerChecklist; categories: ServerCategory[]; items: ServerChecklistItem[] }> {
  return customFetch(`${API}/checklists`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateChecklist(
  id: number,
  data: { name?: string; suggestionsNoticeDismissed?: true },
): Promise<ServerChecklist> {
  return customFetch<ServerChecklist>(`${API}/checklists/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteChecklist(id: number): Promise<void> {
  return customFetch<void>(`${API}/checklists/${id}`, { method: "DELETE" });
}

export async function createCategory(listId: number, data: { name: string; icon: string }): Promise<ServerCategory> {
  return customFetch<ServerCategory>(`${API}/checklists/${listId}/categories`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateCategory(id: number, data: { name?: string; icon?: string }): Promise<ServerCategory> {
  return customFetch<ServerCategory>(`${API}/checklist-categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

/** `moveTo` leva os itens para outra categoria; sem ele, os itens são apagados junto. */
export async function deleteCategory(id: number, moveTo: number | null): Promise<void> {
  const query = moveTo === null ? "items=delete" : `moveTo=${moveTo}`;
  return customFetch<void>(`${API}/checklist-categories/${id}?${query}`, { method: "DELETE" });
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
  data: { itemId: number; guestName: string; guestPhone: string; showName: boolean; status: GiftReservationStatus },
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
  /** `+55…`, ou vazio nas reservas feitas antes de o telefone ser pedido. Só a dona vê. */
  guestPhone: string | null;
  /** O nome aparece para os outros convidados na página pública. */
  showName: boolean;
  status: GiftReservationStatus;
  createdAt: string;
  updatedAt: string;
}
