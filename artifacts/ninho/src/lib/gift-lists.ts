/** Textos e contas das listas de presentes. Dinheiro sempre em centavos. */
import { type GiftItemKind, type GiftItemState } from "@/lib/gift-lists-api";

export const formatCents = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 450" quando é valor cheio, "R$ 12,50" quando tem centavos: ocupa menos na lista. */
export const formatCentsShort = (cents: number) =>
  cents % 100 === 0
    ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : formatCents(cents);

/** Campo de dinheiro em pt-BR ("1.200,50") para centavos; null se não for um valor. */
export function parseCentsInput(text: string): number | null {
  const normalized = text.trim().replace(/^R\$\s*/i, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export const formatCentsInput = (cents: number | null) =>
  cents ? (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

/** Valores sugeridos que cabem no que falta, do menor para o maior. */
export function suggestedAmounts(remainingCents: number): number[] {
  return [2500, 5000, 10000, 20000, 30000].filter((value) => value < remainingCents);
}

type Progress = { kind: GiftItemKind; state: GiftItemState; goal: number; committed: number; remaining: number; unitLabel: string };

/** "R$ 450 de R$ 1.200 · faltam R$ 750" ou "12 de 20 pacotes · faltam 8". */
export function progressText(item: Progress): string {
  if (item.kind === "single") return item.state === "whole" ? "Presente escolhido" : "Disponível";
  if (item.kind === "money") {
    const done = `${formatCentsShort(item.committed)} de ${formatCentsShort(item.goal)}`;
    return item.remaining > 0 ? `${done} · faltam ${formatCentsShort(item.remaining)}` : done;
  }
  const done = `${item.committed} de ${item.goal} ${item.unitLabel}`;
  return item.remaining > 0 ? `${done} · faltam ${item.remaining}` : done;
}

export const percentOf = (part: number, goal: number) => (goal > 0 ? Math.min(100, (part / goal) * 100) : 0);

/** "sábado, 3 de outubro · 15h" (ou "15h30"); vazio sem data. */
export function eventLabel(date: string | null, time: string | null): string {
  if (!date) return "";
  const day = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  if (!time) return day;
  const [hours, minutes] = time.split(":");
  return `${day} · ${Number(hours)}h${minutes === "00" ? "" : minutes}`;
}

/** Dias até o evento, contando só as datas (hoje = 0); null sem data. */
export function daysUntil(date: string | null, today: Date = new Date()): number | null {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

export const TEMPLATE_LABELS = {
  "cha-de-fralda": { title: "Chá de fralda", description: "Fraldas por tamanho, lenço e pomada, com meta de pacotes." },
  "cha-de-bebe": { title: "Chá de bebê", description: "Presentes maiores com meta em reais e itens para uma pessoa." },
  "em-branco": { title: "Em branco", description: "Você monta do zero, do seu jeito." },
} as const;

export const KIND_LABELS: Record<GiftItemKind, { title: string; hint: string }> = {
  money: { title: "Em reais", hint: "Cada pessoa dá um valor até fechar o total." },
  units: { title: "Em unidades", hint: "Cada pessoa leva parte da quantidade." },
  single: { title: "Uma pessoa", hint: "O presente é de quem reservar primeiro." },
};
