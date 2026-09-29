/**
 * Regras de orçamento em um lugar só.
 *
 * O que a usuária chama de "investido" é o dinheiro que ela já gastou: só os
 * itens marcados como "Comprado". "Ganhei" é presente — entra na lista como
 * resolvido, mas não é gasto. E o preço guardado é unitário, então a conta
 * precisa multiplicar pela quantidade.
 *
 * As somas são feitas em centavos inteiros: somar floats de reais acumula
 * erro (0.1 + 0.2) e o total do orçamento é justamente o número que precisa
 * fechar com o que a usuária anotou.
 */

/** Status que conta como gasto. Os outros são "A comprar" e "Ganhei". */
export const PURCHASED_STATUS = "Comprado";

export type SpendableItem = {
  status: string;
  /** Preço unitário em reais, como o app já guarda. */
  price: number;
  qty: number;
};

export function toCents(price: number): number {
  return Number.isFinite(price) ? Math.round(price * 100) : 0;
}

function itemCents(item: SpendableItem): number {
  const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.floor(item.qty) : 0;
  return toCents(item.price) * qty;
}

/** Total já gasto, em centavos. */
export function calcSpentCents(items: readonly SpendableItem[]): number {
  return items
    .filter((item) => item.status === PURCHASED_STATUS)
    .reduce((total, item) => total + itemCents(item), 0);
}

/** Total já gasto, em reais, para exibição. */
export function calcSpent(items: readonly SpendableItem[]): number {
  return calcSpentCents(items) / 100;
}

/** Total já gasto em uma categoria, em reais. */
export function calcSpentByCategory(
  items: readonly (SpendableItem & { category: string })[],
  category: string,
): number {
  return calcSpent(items.filter((item) => item.category === category));
}

/**
 * Categorias que passaram do planejado, com o excesso em reais (design novo, 2026-09-23).
 * Categoria sem valor planejado (0) não entra: sem meta, não há "estouro".
 */
export function calcOverBudget(
  items: readonly (SpendableItem & { category: string })[],
  planned: Readonly<Record<string, number>>,
  categories: readonly string[],
): { category: string; over: number }[] {
  return categories.flatMap((category) => {
    const plannedCents = toCents(planned[category] ?? 0);
    const spentCents = calcSpentCents(items.filter((item) => item.category === category));
    return plannedCents > 0 && spentCents > plannedCents ? [{ category, over: (spentCents - plannedCents) / 100 }] : [];
  });
}
