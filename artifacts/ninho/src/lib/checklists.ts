import { type ChecklistTemplate, type ServerCategory, type ServerChecklist } from "@/lib/api";
import { normalizeSearch } from "@/lib/items";

/**
 * Regras das listas do Enxoval (Enxoval do bebê, Mala da maternidade…) e das categorias de cada
 * uma. Puras e sem DOM: as telas só mostram o resultado.
 */

export const MAX_CHECKLISTS = 10;
export const MAX_CATEGORIES = 12;
export const LIST_NAME_MAX = 60;
export const CATEGORY_NAME_MAX = 30;

export type Checklist = { id: number; name: string; suggestionsNoticeDismissed: boolean };
export type ListCategory = {
  id: number;
  listId: number;
  name: string;
  icon: string;
  tone: string;
  /** Valor planejado no Orçamento, em reais. */
  planned: number;
};

export function adaptChecklist(s: ServerChecklist): Checklist {
  return { id: s.id, name: s.name, suggestionsNoticeDismissed: s.suggestionsNoticeDismissed };
}

export function adaptCategory(s: ServerCategory): ListCategory {
  return { id: s.id, listId: s.listId, name: s.name, icon: s.icon, tone: s.tone, planned: parseFloat(s.planned) || 0 };
}

/** Modelos de lista nova, na ordem em que aparecem no diálogo. */
export const CHECKLIST_TEMPLATES: { id: ChecklistTemplate; title: string; description: string; name: string }[] = [
  { id: "mala-maternidade", title: "Mala da maternidade", description: "Para a mãe, para o bebê e os documentos.", name: "Mala da maternidade" },
  { id: "quarto-do-bebe", title: "Quarto do bebê", description: "Móveis, roupa de cama e organização.", name: "Quarto do bebê" },
  { id: "enxoval", title: "Enxoval do bebê", description: "Roupas, higiene, alimentação e acessórios.", name: "Enxoval do bebê" },
  { id: "em-branco", title: "Em branco", description: "Você monta do zero.", name: "Minha lista" },
];

/** A lista aberta: a que o aparelho lembrou, se ainda existe; senão, a primeira. */
export function pickActiveList<T extends { id: number }>(lists: T[], rememberedId: number | null): T | undefined {
  return lists.find((list) => list.id === rememberedId) ?? lists[0];
}

/** "Passeio " e "PASSEIO" são o mesmo nome: é assim que o servidor também compara. */
export function sameName(a: string, b: string): boolean {
  const clean = (text: string) => normalizeSearch(text).replace(/\s+/g, " ");
  return clean(a) === clean(b);
}

export function isNameTaken(name: string, categories: readonly { id: number; name: string }[], exceptId?: number): boolean {
  return categories.some((category) => category.id !== exceptId && sameName(category.name, name));
}

/**
 * O aviso "começamos com sugestões" aparece enquanto a lista tem item-sugestão e a mãe não o
 * fechou; sem sugestão sobrando, ele some sozinho (LC-R1, LC-R6).
 */
export function showSuggestionsNotice(list: Checklist, items: readonly { listId: number; suggested: boolean }[]): boolean {
  return !list.suggestionsNoticeDismissed && items.some((item) => item.listId === list.id && item.suggested);
}

/** Progresso de cada lista, na ordem das listas: resolvido = tudo que não está "A comprar". */
export function progressByList<T extends { id: number }>(
  lists: readonly T[],
  items: readonly { listId: number; status: string }[],
): { list: T; done: number; total: number; percent: number }[] {
  return lists.map((list) => {
    const inList = items.filter((item) => item.listId === list.id);
    const done = inList.filter((item) => item.status !== "A comprar").length;
    return { list, done, total: inList.length, percent: inList.length ? (done / inList.length) * 100 : 0 };
  });
}

/** "1 item" / "3 itens" — usado nas confirmações de exclusão. */
export function countItems(n: number): string {
  return n === 1 ? "1 item" : `${n} itens`;
}
