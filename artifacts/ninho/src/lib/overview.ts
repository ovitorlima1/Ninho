/**
 * Regras do Início (design novo, 2026-09-22). Puras e sem DOM: a tela só mostra o resultado.
 * "Resolvido" = tudo que não está "A comprar" (comprado ou ganho), a mesma regra de antes.
 */

export type OverviewItem = { name: string; status: string; essential: boolean };

export function enxovalProgress(items: OverviewItem[]): { done: number; total: number; toBuy: number; percent: number } {
  const total = items.length;
  const toBuy = items.filter((item) => item.status === "A comprar").length;
  const done = total - toBuy;
  return { done, total, toBuy, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Pendentes para "Para comprar agora": essenciais primeiro, cada grupo na ordem da lista. */
export function itemsToBuy<T extends OverviewItem>(items: T[], limit = 3): T[] {
  const pending = items.filter((item) => item.status === "A comprar");
  return [...pending.filter((item) => item.essential), ...pending.filter((item) => !item.essential)].slice(0, limit);
}

const wholeReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

/** Valor curto para os blocos do Início ("R$ 850", "R$ 3,2 mil"): o valor completo quebra linha no celular. */
export function moneyShort(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return (safe < 1000 ? wholeReais.format(Math.round(safe)) : compactReais.format(safe)).replace(/\s/g, " ");
}
