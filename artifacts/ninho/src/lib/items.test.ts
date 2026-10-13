import assert from "node:assert/strict";
import { test } from "vitest";
import { normalizeSearch, searchItems } from "./items";

const CATEGORIES = [
  { id: 1, name: "Roupas" },
  { id: 2, name: "Higiene" },
  { id: 3, name: "Alimentação" },
  { id: 4, name: "Acessórios" },
];
const item = (name: string, category: string, group = "") =>
  ({ name, categoryId: CATEGORIES.find((c) => c.name === category)!.id, group });
const items = [
  item("Macacão de algodão", "Roupas", "0–3 meses"),
  item("Body manga curta", "Roupas", "RN · essenciais"),
  item("Toalha com capuz", "Higiene", "Banho"),
  item("Babador de tecido", "Alimentação"),
  item("Bolsa da maternidade", "Acessórios"),
];
const names = (query: string) => searchItems(items, query, CATEGORIES).flatMap((g) => g.items.map((i) => i.name));

test("normaliza tirando acento, caixa e espaços das pontas", () => {
  assert.equal(normalizeSearch("  Macacão ÇÃ "), "macacao ca");
});

test("busca acha sem acento nem caixa", () => {
  assert.deepEqual(names("MACACAO"), ["Macacão de algodão"]);
});

test("busca procura também no grupo do item", () => {
  assert.deepEqual(names("banho"), ["Toalha com capuz"]);
});

test("resultados vêm na ordem das categorias, sem as vazias", () => {
  assert.deepEqual(searchItems(items, "b", CATEGORIES).map((g) => g.category.name), ["Roupas", "Higiene", "Alimentação", "Acessórios"]);
  assert.deepEqual(searchItems(items, "de", CATEGORIES).map((g) => g.category.name), ["Roupas", "Alimentação", "Acessórios"]);
});

test("texto vazio ou só espaços não busca", () => {
  assert.deepEqual(searchItems(items, "   ", CATEGORIES), []);
});

test("nada bate → nenhum grupo", () => {
  assert.deepEqual(searchItems(items, "carrinho", CATEGORIES), []);
});

test("categoria que não foi passada fica de fora: a busca vale só para a lista aberta", () => {
  assert.deepEqual(searchItems(items, "b", CATEGORIES.slice(0, 1)).map((g) => g.category.name), ["Roupas"]);
});
