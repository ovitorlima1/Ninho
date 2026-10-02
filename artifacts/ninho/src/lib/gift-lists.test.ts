import assert from "node:assert/strict";
import { test } from "vitest";
import { daysUntil, eventLabel, formatCentsInput, formatCentsShort, parseCentsInput, percentOf, progressText, suggestedAmounts } from "./gift-lists";

const nbsp = (text: string) => text.replace(/\u00a0/g, " ");

test("dinheiro digitado em pt-BR vira centavos", () => {
  assert.equal(parseCentsInput("1.200,50"), 120050);
  assert.equal(parseCentsInput("R$ 100"), 10000);
  assert.equal(parseCentsInput("45,9"), 4590);
  assert.equal(parseCentsInput("abc"), null);
  assert.equal(parseCentsInput("10,999"), null);
  assert.equal(parseCentsInput(""), null);
});

test("centavos voltam para o campo com vírgula", () => {
  assert.equal(formatCentsInput(120050), "1.200,50");
  assert.equal(formatCentsInput(null), "");
});

test("valor cheio aparece sem centavos na lista", () => {
  assert.equal(nbsp(formatCentsShort(45000)), "R$ 450");
  assert.equal(nbsp(formatCentsShort(1250)), "R$ 12,50");
});

test("sugestões só com valores que cabem no que falta", () => {
  assert.deepEqual(suggestedAmounts(75000), [2500, 5000, 10000, 20000, 30000]);
  assert.deepEqual(suggestedAmounts(8000), [2500, 5000]);
  assert.deepEqual(suggestedAmounts(2500), []);
});

test("texto de progresso em reais, em unidades e de uma pessoa", () => {
  const base = { goal: 120000, committed: 45000, remaining: 75000, unitLabel: "unidades" };
  assert.equal(nbsp(progressText({ ...base, kind: "money", state: "progress" })), "R$ 450 de R$ 1.200 · faltam R$ 750");
  assert.equal(nbsp(progressText({ kind: "money", state: "complete", goal: 90000, committed: 90000, remaining: 0, unitLabel: "" })), "R$ 900 de R$ 900");
  assert.equal(progressText({ kind: "units", state: "progress", goal: 20, committed: 12, remaining: 8, unitLabel: "pacotes" }), "12 de 20 pacotes · faltam 8");
  assert.equal(progressText({ kind: "single", state: "open", goal: 0, committed: 0, remaining: 0, unitLabel: "" }), "Disponível");
});

test("porcentagem nunca passa de 100 nem divide por zero", () => {
  assert.equal(percentOf(45000, 120000), 37.5);
  assert.equal(percentOf(5, 0), 0);
  assert.equal(percentOf(30, 20), 100);
});

test("data do evento por extenso, com hora quando houver", () => {
  assert.equal(eventLabel("2026-10-03", "15:00"), "sábado, 3 de outubro · 15h");
  assert.equal(eventLabel("2026-10-03", "15:30"), "sábado, 3 de outubro · 15h30");
  assert.equal(eventLabel("2026-10-03", null), "sábado, 3 de outubro");
  assert.equal(eventLabel(null, "15:00"), "");
});

test("dias até o evento contam só as datas", () => {
  const today = new Date(2026, 9, 2, 23, 30);
  assert.equal(daysUntil("2026-10-03", today), 1);
  assert.equal(daysUntil("2026-10-02", today), 0);
  assert.equal(daysUntil(null, today), null);
});
