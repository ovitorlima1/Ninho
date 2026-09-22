import assert from "node:assert/strict";
import { test } from "vitest";
import { enxovalProgress, itemsToBuy, moneyShort, type OverviewItem } from "./overview";

const item = (name: string, over: Partial<OverviewItem> = {}): OverviewItem => ({
  name,
  status: "A comprar",
  essential: false,
  ...over,
});

test("progresso conta comprado e ganho como resolvidos e arredonda a porcentagem", () => {
  const items = [
    item("body", { status: "Comprado" }),
    item("manta", { status: "Ganhei" }),
    item("fralda"),
  ];
  assert.deepEqual(enxovalProgress(items), { done: 2, total: 3, toBuy: 1, percent: 67 });
});

test("lista vazia não divide por zero", () => {
  assert.deepEqual(enxovalProgress([]), { done: 0, total: 0, toBuy: 0, percent: 0 });
});

test("para comprar agora traz essenciais primeiro, na ordem da lista, até o limite", () => {
  const items = [
    item("toalha"),
    item("body", { essential: true }),
    item("cueiro", { status: "Comprado", essential: true }),
    item("fralda", { essential: true }),
    item("manta"),
  ];
  assert.deepEqual(itemsToBuy(items).map((i) => i.name), ["body", "fralda", "toalha"]);
  assert.deepEqual(itemsToBuy(items, 1).map((i) => i.name), ["body"]);
});

test("sem pendentes, nada para comprar", () => {
  assert.deepEqual(itemsToBuy([item("body", { status: "Comprado" })]), []);
});

test("valor curto dos blocos: reais inteiros abaixo de mil, 'mil' com uma casa acima", () => {
  assert.equal(moneyShort(0), "R$ 0");
  assert.equal(moneyShort(849.6), "R$ 850");
  assert.equal(moneyShort(999.9), "R$ 1.000");
  assert.equal(moneyShort(3200), "R$ 3,2 mil");
  assert.equal(moneyShort(12_500), "R$ 12,5 mil");
  assert.equal(moneyShort(Number.NaN), "R$ 0");
});
