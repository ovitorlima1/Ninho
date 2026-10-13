import assert from "node:assert/strict";
import { test } from "vitest";
import { CATEGORY_ICONS, CATEGORY_TONES, CHECKLIST_TEMPLATES, MAX_CHECKLIST_CATEGORIES } from "@workspace/db/schema";
import {
  clearsSuggestion,
  defaultLook,
  isNameTaken,
  looksUntouched,
  nextTone,
  normalizeName,
  planLegacyMigration,
} from "./checklist-rules";
import { CHECKLIST_TEMPLATE_DATA } from "./checklist-templates";

test("nome igual sem acento, sem caixa e com espaços sobrando é o mesmo nome", () => {
  assert.equal(normalizeName("  Alimentação  "), "alimentacao");
  assert.equal(normalizeName("Para   o BEBÊ"), "para o bebe");
  const existing = [{ id: 1, name: "Higiene" }, { id: 2, name: "Alimentação" }];
  assert.equal(isNameTaken("alimentacao", existing), true);
  assert.equal(isNameTaken("Passeio", existing), false);
  // Renomear uma categoria para o próprio nome (mudando só a caixa) não é repetição.
  assert.equal(isNameTaken("HIGIENE", existing, 1), false);
  assert.equal(isNameTaken("HIGIENE", existing, 2), true);
});

test("a cor da categoria nova segue o rodízio das quatro cores", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(nextTone), ["lilac", "mint", "peach", "butter", "lilac", "mint"]);
});

test("as quatro categorias do modelo voltam com o mesmo ícone e a mesma cor", () => {
  assert.deepEqual(defaultLook("higiene"), { icon: "clipboard", tone: "mint" });
  assert.deepEqual(defaultLook("Acessórios"), { icon: "sparkles", tone: "butter" });
  assert.equal(defaultLook("Passeio"), undefined);
});

test("só o item idêntico ao do modelo e ainda a comprar conta como sugestão", () => {
  const body = { name: "Body manga curta", qty: 6, price: "38.00", status: "A comprar" };
  assert.equal(looksUntouched(body), true);
  assert.equal(looksUntouched({ ...body, qty: 8 }), false);
  assert.equal(looksUntouched({ ...body, price: "35.00" }), false);
  assert.equal(looksUntouched({ ...body, status: "Comprado" }), false);
  assert.equal(looksUntouched({ ...body, name: "Body manga longa" }), false);
  assert.equal(looksUntouched({ name: "Manta de tricô", qty: 1, price: "0", status: "A comprar" }), false);
});

test("migração de conta antiga mantém as quatro categorias, o planejado e marca só o que não foi mexido", () => {
  const plan = planLegacyMigration(
    [
      { id: 1, name: "Body manga curta", category: "Roupas", qty: 6, price: "38.00", status: "A comprar" },
      { id: 2, name: "Macacão de algodão", category: "Roupas", qty: 5, price: "74.00", status: "Comprado" },
      { id: 3, name: "Manta de tricô", category: "Roupas", qty: 1, price: "0.00", status: "A comprar" },
    ],
    [{ category: "Roupas", planned: "1500.00" }, { category: "Higiene", planned: "0.00" }],
  );
  assert.deepEqual(plan.categories.map((category) => category.name), ["Roupas", "Higiene", "Alimentação", "Acessórios"]);
  assert.deepEqual(plan.categories.map((category) => category.planned), ["1500.00", "0", "0", "0"]);
  assert.deepEqual(plan.categories[0], { name: "Roupas", icon: "heart", tone: "lilac", planned: "1500.00" });
  assert.deepEqual(plan.suggestedItemIds, [1]);
});

test("migração não perde item de categoria desconhecida nem conta vazia", () => {
  const plan = planLegacyMigration(
    [{ id: 9, name: "Cadeirinha", category: "Passeio", qty: 1, price: "0", status: "A comprar" }],
    [{ category: "passeio", planned: 300 }],
  );
  assert.deepEqual(plan.categories.map((category) => category.name), ["Roupas", "Higiene", "Alimentação", "Acessórios", "Passeio"]);
  assert.equal(plan.categories[4]!.planned, "300.00");
  assert.equal(planLegacyMigration([], []).categories.length, 4);
});

test("mexer no item tira a sugestão; vincular inspiração não", () => {
  assert.equal(clearsSuggestion({ status: "Comprado" }), true);
  assert.equal(clearsSuggestion({ qty: 2 }), true);
  assert.equal(clearsSuggestion({ categoryId: 4 }), true);
  assert.equal(clearsSuggestion({ recommendationId: "kit-higiene" }), false);
  assert.equal(clearsSuggestion({ recommendationId: null }), false);
  assert.equal(clearsSuggestion({}), false);
});

test("todo modelo cabe nos limites e usa só ícones e cores conhecidos", () => {
  for (const template of CHECKLIST_TEMPLATES) {
    const { name, categories } = CHECKLIST_TEMPLATE_DATA[template];
    assert.ok(name.length > 0 && name.length <= 60, template);
    assert.ok(categories.length >= 1 && categories.length <= MAX_CHECKLIST_CATEGORIES, template);
    assert.equal(new Set(categories.map((category) => normalizeName(category.name))).size, categories.length, template);
    for (const category of categories) {
      assert.ok(category.name.length <= 30, category.name);
      assert.ok((CATEGORY_ICONS as readonly string[]).includes(category.icon), category.name);
      assert.ok((CATEGORY_TONES as readonly string[]).includes(category.tone), category.name);
      for (const item of category.items) assert.ok(item.qty >= 1 && Number(item.price) >= 0, item.name);
    }
  }
  // Os preços e o planejado do enxoval são os de antes desta feature.
  const enxoval = CHECKLIST_TEMPLATE_DATA.enxoval.categories;
  assert.equal(enxoval.flatMap((category) => category.items).length, 10);
  assert.deepEqual(enxoval.map((category) => category.planned), ["1240", "680", "520", "940"]);
});
