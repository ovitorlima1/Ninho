import assert from "node:assert/strict";
import { test } from "vitest";
import {
  calcBudgetRows,
  calcSpent,
  calcSpentCents,
  toCents,
  type SpendableItem,
} from "./budget";

const item = (over: Partial<SpendableItem> = {}): SpendableItem => ({
  status: "Comprado",
  price: 10,
  qty: 1,
  ...over,
});

test("multiplica o preço unitário pela quantidade", () => {
  assert.equal(calcSpentCents([item({ price: 74, qty: 5 })]), 37_000);
  assert.equal(calcSpent([item({ price: 74, qty: 5 })]), 370);
});

test("presente não é gasto: só 'Comprado' entra na conta", () => {
  const items = [
    item({ status: "Ganhei", price: 38, qty: 6 }),
    item({ status: "A comprar", price: 42, qty: 3 }),
    item({ status: "Comprado", price: 74, qty: 5 }),
  ];

  // Cenário da auditoria: a tela mostrava R$ 112,00 (38 + 74, sem quantidade
  // e contando o presente) quando o certo é 5 × 74.
  assert.equal(calcSpent(items), 370);
});

test("soma em centavos inteiros, sem erro de ponto flutuante", () => {
  const items = [item({ price: 0.1, qty: 1 }), item({ price: 0.2, qty: 1 })];

  assert.equal(calcSpentCents(items), 30);
  assert.equal(calcSpent(items), 0.3);
  assert.equal(calcSpentCents([item({ price: 19.99, qty: 3 })]), 5_997);
});

test("arredonda o preço para o centavo mais próximo", () => {
  assert.equal(toCents(12.345), 1_235);
  assert.equal(toCents(12.344), 1_234);
});

test("ignora quantidade e preço inválidos em vez de somar NaN", () => {
  assert.equal(calcSpentCents([item({ qty: 0 }), item({ qty: -3 })]), 0);
  assert.equal(calcSpentCents([item({ price: Number.NaN })]), 0);
});

test("lista vazia soma zero", () => {
  assert.equal(calcSpentCents([]), 0);
  assert.equal(calcSpent([]), 0);
});

test("linha do orçamento soma só o que foi comprado na própria categoria", () => {
  const items = [
    { ...item({ price: 74, qty: 5 }), categoryId: 1 },
    { ...item({ price: 58, qty: 2 }), categoryId: 2 },
    { ...item({ status: "Ganhei", price: 96, qty: 1 }), categoryId: 2 },
  ];
  const rows = calcBudgetRows(items, [{ id: 1, planned: 0 }, { id: 2, planned: 0 }, { id: 4, planned: 0 }]);

  assert.deepEqual(rows.map((row) => row.spent), [370, 116, 0]);
});

test("categoria estourada: só quem tem planejado e gastou mais, com o excesso exato", () => {
  const items = [
    { categoryId: 3, status: "Comprado", price: 240, qty: 3 },
    { categoryId: 1, status: "Comprado", price: 100, qty: 2 },
    { categoryId: 2, status: "Comprado", price: 50, qty: 1 },
    { categoryId: 4, status: "Ganhei", price: 900, qty: 1 },
  ];
  const rows = calcBudgetRows(items, [
    { id: 1, planned: 200 },
    { id: 2, planned: 0 },
    { id: 3, planned: 600 },
    { id: 4, planned: 100 },
  ]);

  assert.deepEqual(rows.filter((row) => row.over > 0), [{ id: 3, spent: 720, planned: 600, over: 120 }]);
  // Sem valor planejado não há estouro, por mais que se gaste.
  assert.equal(rows[1]!.over, 0);
});

test("categoria criada agora entra com zero planejado e zero gasto", () => {
  assert.deepEqual(calcBudgetRows([], [{ id: 9, planned: 0 }]), [{ id: 9, spent: 0, planned: 0, over: 0 }]);
});
