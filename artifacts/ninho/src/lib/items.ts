import {
  type CategoryKey,
  type ItemStatus,
  type ServerChecklistItem,
  type ServerGiftReservation,
} from "@/lib/api";
import { money } from "@/lib/format";

export type ChecklistItem = {
  id: number;
  name: string;
  category: CategoryKey;
  group: string;
  qty: number;
  status: ItemStatus;
  price: number;
  essential: boolean;
  recommendationId: string | null;
  giftReservation: ServerGiftReservation | null;
};

export function adaptItem(s: ServerChecklistItem, giftReservation: ServerGiftReservation | null = null): ChecklistItem {
  return {
    id: s.id,
    name: s.name,
    category: s.category as CategoryKey,
    group: s.group,
    qty: s.qty,
    status: s.status as ItemStatus,
    price: parseFloat(s.price) || 0,
    essential: s.essential,
    recommendationId: s.recommendationId,
    giftReservation,
  };
}

/** Opções de status na ordem em que a usuária pensa: a comprar → resolvido. */
export const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string; short: string }[] = [
  { value: "A comprar", label: "A comprar", short: "a comprar" },
  { value: "Comprado", label: "Comprado", short: "comprei" },
  { value: "Ganhei", label: "Ganhei de presente", short: "ganhei" },
];

/** "6 un. × R$ 38,00 · R$ 228,00" — deixa explícito que o preço é unitário. */
export function describeItemTotal(item: { qty: number; price: number; status: ItemStatus }): string {
  if (item.price <= 0) return `${item.qty} un.`;
  if (item.qty <= 1) return money(item.price);
  return `${item.qty} un. × ${money(item.price)} · ${money(item.price * item.qty)}`;
}

export const CATEGORIES: CategoryKey[] = ["Roupas", "Higiene", "Alimentação", "Acessórios"];

/** Campo de dinheiro em pt-BR: aceita vírgula, recusa negativo. */
export function parsePriceInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function formatPriceInput(price: number): string {
  return price > 0 ? price.toFixed(2).replace(".", ",") : "";
}
