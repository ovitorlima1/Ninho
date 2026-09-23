import assert from "node:assert/strict";
import { test } from "vitest";
import {
  calcOverBudget,
  calcSpent,
  calcSpentByCategory,
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

test("soma por categoria considera só a categoria pedida", () => {
  const items = [
    { ...item({ price: 74, qty: 5 }), category: "Roupas" },
    { ...item({ price: 58, qty: 2 }), category: "Higiene" },
    { ...item({ status: "Ganhei", price: 96, qty: 1 }), category: "Higiene" },
  ];

  assert.equal(calcSpentByCategory(items, "Roupas"), 370);
  assert.equal(calcSpentByCategory(items, "Higiene"), 116);
  assert.equal(calcSpentByCategory(items, "Acessórios"), 0);
});

test("categoria estourada: só quem tem planejado e gastou mais, com o excesso exato", () => {
  const items = [
    { category: "Alimentação", status: "Comprado", price: 240, qty: 3 },
    { category: "Roupas", status: "Comprado", price: 100, qty: 2 },
    { category: "Higiene", status: "Comprado", price: 50, qty: 1 },
    { category: "Acessórios", status: "Ganhei", price: 900, qty: 1 },
  ];
  const planned = { Alimentação: 600, Roupas: 200, Higiene: 0, Acessórios: 100 };
  assert.deepEqual(calcOverBudget(items, planned, ["Roupas", "Higiene", "Alimentação", "Acessórios"]), [
    { category: "Alimentação", over: 120 },
  ]);
});
