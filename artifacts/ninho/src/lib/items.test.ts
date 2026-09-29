import assert from "node:assert/strict";
import { test } from "vitest";
import { type CategoryKey } from "./api";
import { normalizeSearch, searchItems } from "./items";

const item = (name: string, category: CategoryKey, group = "") => ({ name, category, group });
const items = [
  item("Macacão de algodão", "Roupas", "0–3 meses"),
  item("Body manga curta", "Roupas", "RN · essenciais"),
  item("Toalha com capuz", "Higiene", "Banho"),
  item("Babador de tecido", "Alimentação"),
  item("Bolsa da maternidade", "Acessórios"),
];
const names = (query: string) => searchItems(items, query).flatMap((g) => g.items.map((i) => i.name));

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
  assert.deepEqual(searchItems(items, "b").map((g) => g.category), ["Roupas", "Higiene", "Alimentação", "Acessórios"]);
  assert.deepEqual(searchItems(items, "de").map((g) => g.category), ["Roupas", "Alimentação", "Acessórios"]);
});

test("texto vazio ou só espaços não busca", () => {
  assert.deepEqual(searchItems(items, "   "), []);
});

test("nada bate → nenhum grupo", () => {
  assert.deepEqual(searchItems(items, "carrinho"), []);
});
