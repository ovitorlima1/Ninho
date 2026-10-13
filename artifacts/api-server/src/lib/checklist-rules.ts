import { CATEGORY_TONES, type CategoryIcon, type CategoryTone } from "@workspace/db/schema";
import { CHECKLIST_TEMPLATE_DATA } from "./checklist-templates";

/**
 * Regras das listas do Enxoval, sem banco: nome repetido, cor da categoria,
 * o que conta como sugestão e o plano de migração das contas antigas.
 */

/** "Alimentação " e "alimentacao" são o mesmo nome: sem acento, sem caixa, espaços colapsados. */
export function normalizeName(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isNameTaken(name: string, existing: readonly { id: number; name: string }[], exceptId?: number): boolean {
  const wanted = normalizeName(name);
  return existing.some((other) => other.id !== exceptId && normalizeName(other.name) === wanted);
}

/** Cor da categoria nova: rodízio pelas quatro cores, na ordem em que a lista cresce. */
export function nextTone(count: number): CategoryTone {
  return CATEGORY_TONES[count % CATEGORY_TONES.length]!;
}

const ENXOVAL = CHECKLIST_TEMPLATE_DATA.enxoval.categories;

/** Ícone e cor das quatro categorias do modelo, para recriar uma delas com a mesma cara. */
export function defaultLook(name: string): { icon: CategoryIcon; tone: CategoryTone } | undefined {
  const wanted = normalizeName(name);
  const match = ENXOVAL.find((category) => normalizeName(category.name) === wanted);
  return match ? { icon: match.icon, tone: match.tone } : undefined;
}

type LegacyItem = { id: number; name: string; category: string; qty: number; price: string | number; status: string };

/**
 * Item igual ao que veio no modelo do enxoval e ainda "A comprar": a mãe não mexeu, então continua
 * sendo sugestão. Qualquer diferença (nome, quantidade, preço, status) faz dele um item dela.
 */
export function looksUntouched(item: Omit<LegacyItem, "id" | "category">): boolean {
  if (item.status !== "A comprar") return false;
  return ENXOVAL.some((category) => category.items.some((template) =>
    template.name === item.name && template.qty === item.qty && Number(template.price) === Number(item.price)));
}

export type PlannedCategory = { name: string; icon: CategoryIcon; tone: CategoryTone; planned: string };

/**
 * Conta de antes das listas: as quatro categorias do modelo (sempre, na ordem de sempre) mais qualquer
 * outro nome que apareça nos itens ou no orçamento, cada uma com o valor que estava planejado.
 */
export function planLegacyMigration(
  items: readonly LegacyItem[],
  budget: readonly { category: string; planned: string | number }[],
): { categories: PlannedCategory[]; suggestedItemIds: number[] } {
  const plannedFor = (name: string): string => {
    const row = budget.find((entry) => normalizeName(entry.category) === normalizeName(name));
    const value = row ? Number(row.planned) : 0;
    return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "0";
  };

  const categories: PlannedCategory[] = [];
  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || categories.some((category) => normalizeName(category.name) === normalizeName(trimmed))) return;
    const look = defaultLook(trimmed) ?? { icon: "heart" as const, tone: nextTone(categories.length) };
    categories.push({ name: trimmed, ...look, planned: plannedFor(trimmed) });
  };
  for (const category of ENXOVAL) add(category.name);
  for (const item of items) add(item.category);
  for (const entry of budget) add(entry.category);

  return { categories, suggestedItemIds: items.filter(looksUntouched).map((item) => item.id) };
}

/** Mexer em nome, quantidade, preço, categoria ou status faz o item deixar de ser sugestão (LC-R4). */
export function clearsSuggestion(patch: Record<string, unknown>): boolean {
  return ["name", "qty", "price", "categoryId", "status"].some((field) => patch[field] !== undefined);
}
