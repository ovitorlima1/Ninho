import assert from "node:assert/strict";
import { test } from "vitest";
import {
  CATEGORY_NAME_MAX,
  CHECKLIST_TEMPLATES,
  LIST_NAME_MAX,
  countItems,
  isNameTaken,
  pickActiveList,
  progressByList,
  sameName,
  showSuggestionsNotice,
} from "./checklists";

const enxoval = { id: 1, name: "Enxoval do bebê", suggestionsNoticeDismissed: false };
const mala = { id: 2, name: "Mala da maternidade", suggestionsNoticeDismissed: false };

test("lista aberta: a lembrada pelo aparelho, ou a primeira se ela não existe mais", () => {
  assert.equal(pickActiveList([enxoval, mala], 2), mala);
  assert.equal(pickActiveList([enxoval, mala], 99), enxoval);
  assert.equal(pickActiveList([enxoval, mala], null), enxoval);
  assert.equal(pickActiveList([], 1), undefined);
});

test("nome repetido ignora acento, caixa e espaço sobrando", () => {
  assert.equal(sameName("  Alimentação ", "alimentacao"), true);
  assert.equal(sameName("Para  o bebê", "para o bebe"), true);
  assert.equal(sameName("Passeio", "Passeios"), false);
  const categories = [{ id: 1, name: "Roupas" }, { id: 2, name: "Higiene" }];
  assert.equal(isNameTaken("ROUPAS", categories), true);
  assert.equal(isNameTaken("Roupas", categories, 1), false);
  assert.equal(isNameTaken("Passeio", categories), false);
});

test("aviso aparece só enquanto há sugestão na lista e ele não foi fechado", () => {
  const items = [
    { listId: 1, suggested: true },
    { listId: 1, suggested: false },
    { listId: 2, suggested: false },
  ];
  assert.equal(showSuggestionsNotice(enxoval, items), true);
  // Sugestão de outra lista não acende o aviso desta.
  assert.equal(showSuggestionsNotice(mala, items), false);
  assert.equal(showSuggestionsNotice({ ...enxoval, suggestionsNoticeDismissed: true }, items), false);
  // A última sugestão foi mexida: o aviso some sozinho.
  assert.equal(showSuggestionsNotice(enxoval, items.map((item) => ({ ...item, suggested: false }))), false);
});

test("progresso por lista conta comprado e ganho como resolvido", () => {
  const rows = progressByList([enxoval, mala, { id: 3, name: "Vazia", suggestionsNoticeDismissed: false }], [
    { listId: 1, status: "Comprado" },
    { listId: 1, status: "Ganhei" },
    { listId: 1, status: "A comprar" },
    { listId: 1, status: "A comprar" },
    { listId: 2, status: "A comprar" },
  ]);
  assert.deepEqual(rows.map(({ done, total, percent }) => ({ done, total, percent })), [
    { done: 2, total: 4, percent: 50 },
    { done: 0, total: 1, percent: 0 },
    { done: 0, total: 0, percent: 0 },
  ]);
});

test("contagem de itens no singular e no plural", () => {
  assert.equal(countItems(1), "1 item");
  assert.equal(countItems(0), "0 itens");
  assert.equal(countItems(12), "12 itens");
});

test("nome sugerido de cada modelo cabe no campo", () => {
  for (const template of CHECKLIST_TEMPLATES) assert.ok(template.name.length <= LIST_NAME_MAX, template.id);
  assert.ok(CATEGORY_NAME_MAX < LIST_NAME_MAX);
});
