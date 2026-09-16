import assert from "node:assert/strict";
import { test } from "vitest";
import {
  calcGestation,
  calcGestationalWeek,
  formatGestation,
  getDueDateBounds,
  validateDueDate,
} from "./gestation";

/** Data prevista fixa: 2026-12-20. */
const due = "2026-12-20";
const at = (iso: string) => new Date(`${iso}T09:00:00`);

test("conta semanas completas, sem arredondar para a semana seguinte", () => {
  // 2026-09-11 → faltam 100 dias → 180 dias de gestação → 25 semanas e 5 dias.
  const gestation = calcGestation(due, at("2026-09-11"));

  assert.equal(gestation?.week, 25);
  assert.equal(gestation?.days, 5);
  assert.equal(gestation?.daysToGo, 100);
  assert.equal(gestation?.isOverdue, false);
  assert.equal(formatGestation(gestation!), "semana 25 · 5 dias");
});

test("vira a semana no dia certo", () => {
  assert.equal(calcGestation(due, at("2026-09-13"))?.days, 0);
  assert.equal(calcGestation(due, at("2026-09-13"))?.week, 26);
  assert.equal(formatGestation(calcGestation(due, at("2026-09-13"))!), "semana 26");
  assert.equal(calcGestation(due, at("2026-09-14"))?.week, 26);
  assert.equal(calcGestation(due, at("2026-09-14"))?.days, 1);
});

test("trava em 40 quando a data prevista chega ou passa", () => {
  const onDueDate = calcGestation(due, at("2026-12-20"));
  assert.equal(onDueDate?.week, 40);
  assert.equal(onDueDate?.isOverdue, false);

  const late = calcGestation(due, at("2027-01-05"));
  assert.equal(late?.week, 40, "não existe 'semana 43 de 40'");
  assert.equal(late?.isOverdue, true);
  assert.equal(late?.daysToGo, -16);
  assert.equal(formatGestation(late!), "semana 40");
});

test("horário de verão não muda a contagem", () => {
  // A troca de horário no Brasil não está em vigor, mas o cálculo é feito ao
  // meio-dia justamente para sobreviver a fusos com mudança de hora.
  const morning = calcGestation(due, new Date("2026-10-18T00:30:00"));
  const night = calcGestation(due, new Date("2026-10-18T23:30:00"));
  assert.deepEqual(morning, night);
});

test("recusa data inválida ou distante demais", () => {
  assert.equal(calcGestation("2026-02-31", at("2026-09-11")), null);
  assert.equal(calcGestation("nem-data", at("2026-09-11")), null);
  assert.equal(calcGestation(null, at("2026-09-11")), null);
  // Mais de 280 dias à frente: ainda não é uma gestação.
  assert.equal(calcGestation("2028-01-01", at("2026-09-11")), null);
});

test("calcGestationalWeek continua devolvendo só o número", () => {
  assert.equal(calcGestationalWeek(due, at("2026-09-11")), 25);
  assert.equal(calcGestationalWeek(null, at("2026-09-11")), null);
});

test("limites da data prevista: 6 semanas atrás até 42 semanas à frente", () => {
  const bounds = getDueDateBounds(at("2026-09-11"));

  assert.equal(bounds.min, "2026-07-31");
  assert.equal(bounds.max, "2027-07-02");
  assert.equal(validateDueDate("2026-12-20", at("2026-09-11")), null);
  assert.equal(validateDueDate(bounds.min, at("2026-09-11")), null);
  assert.equal(validateDueDate(bounds.max, at("2026-09-11")), null);
  assert.match(validateDueDate("2026-01-10", at("2026-09-11"))!, /não pode ser anterior/);
  assert.match(validateDueDate("2028-01-10", at("2026-09-11"))!, /não pode ser depois/);
  assert.match(validateDueDate("2026-13-40", at("2026-09-11"))!, /Confira a data/);
});
