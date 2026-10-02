import { expect, test } from "vitest";
import { checkItemChange, checkPledge, summarizeItem, type RuleItem, type RulePledge } from "./gift-rules";

const money = (goalCents: number, over: Partial<RuleItem> = {}): RuleItem => ({ kind: "money", goalCents, goalUnits: null, allowWhole: true, hidden: false, ...over });
const units = (goalUnits: number): RuleItem => ({ kind: "units", goalCents: null, goalUnits, allowWhole: true, hidden: false });
const single: RuleItem = { kind: "single", goalCents: null, goalUnits: null, allowWhole: true, hidden: false };
const give = (amountCents: number, status = "promised"): RulePledge => ({ kind: "money", status, amountCents, units: null });
const bring = (n: number, status = "promised"): RulePledge => ({ kind: "units", status, amountCents: null, units: n });
const whole = (status = "promised"): RulePledge => ({ kind: "whole", status, amountCents: null, units: null });

test("prometido e recebido contam para o que falta; cancelado não", () => {
  const summary = summarizeItem(money(120000), [give(30000, "confirmed"), give(15000), give(50000, "cancelled")]);
  expect(summary).toEqual({ state: "progress", goal: 120000, committed: 45000, confirmed: 30000, remaining: 75000, active: 2 });
});

test("meta fechada vira completo mesmo com parte só prometida", () => {
  expect(summarizeItem(money(10000), [give(4000, "confirmed"), give(6000)]).state).toBe("complete");
  expect(summarizeItem(units(20), [bring(12), bring(8)]).remaining).toBe(0);
});

test("item sem promessa fica disponível", () => {
  expect(summarizeItem(money(18000), []).state).toBe("open");
  expect(summarizeItem(single, []).state).toBe("open");
});

test("item inteiro fecha o item e não deixa saldo", () => {
  const summary = summarizeItem(money(18000), [whole()]);
  expect(summary).toMatchObject({ state: "whole", remaining: 0, committed: 18000, confirmed: 0 });
  expect(summarizeItem(money(18000), [whole("confirmed")]).confirmed).toBe(18000);
  expect(summarizeItem(single, [whole()]).state).toBe("whole");
});

test("contribuição aceita de R$ 1,00 até o que falta", () => {
  const item = money(120000);
  const summary = summarizeItem(item, [give(45000)]);
  expect(checkPledge(item, summary, { kind: "money", amountCents: 75000 }, true)).toEqual({ ok: true });
  expect(checkPledge(item, summary, { kind: "money", amountCents: 75001 }, true)).toEqual({ ok: false, reason: "too-high", remaining: 75000 });
  expect(checkPledge(item, summary, { kind: "money", amountCents: 99 }, true)).toMatchObject({ ok: false, reason: "too-low" });
});

test("contribuição em dinheiro exige Pix cadastrado", () => {
  const item = money(120000);
  expect(checkPledge(item, summarizeItem(item, []), { kind: "money", amountCents: 5000 }, false)).toMatchObject({ ok: false, reason: "pix-missing" });
});

test("item inteiro só enquanto ninguém participou e se a mãe aceitar", () => {
  const item = money(18000);
  expect(checkPledge(item, summarizeItem(item, []), { kind: "whole", wholeMode: "bring" }, false)).toEqual({ ok: true });
  expect(checkPledge(item, summarizeItem(item, []), { kind: "whole", wholeMode: "pix" }, false)).toMatchObject({ ok: false, reason: "pix-missing" });
  expect(checkPledge(item, summarizeItem(item, [give(1000)]), { kind: "whole", wholeMode: "bring" }, true)).toMatchObject({ ok: false, reason: "whole-unavailable" });
  const closed = money(18000, { allowWhole: false });
  expect(checkPledge(closed, summarizeItem(closed, []), { kind: "whole", wholeMode: "bring" }, true)).toMatchObject({ ok: false, reason: "whole-unavailable" });
});

test("item de uma pessoa: o primeiro leva, o segundo é recusado", () => {
  expect(checkPledge(single, summarizeItem(single, []), { kind: "whole" }, false)).toEqual({ ok: true });
  expect(checkPledge(single, summarizeItem(single, [whole()]), { kind: "whole" }, false)).toMatchObject({ ok: false, reason: "taken" });
});

test("unidades: de 1 até o que falta", () => {
  const item = units(20);
  const summary = summarizeItem(item, [bring(12)]);
  expect(checkPledge(item, summary, { kind: "units", units: 8 }, false)).toEqual({ ok: true });
  expect(checkPledge(item, summary, { kind: "units", units: 9 }, false)).toEqual({ ok: false, reason: "too-high", remaining: 8 });
  expect(checkPledge(item, summary, { kind: "units", units: 0 }, false)).toMatchObject({ ok: false, reason: "too-low" });
});

test("item escondido, completo ou do tipo errado é recusado", () => {
  const hidden = money(1000, { hidden: true });
  expect(checkPledge(hidden, summarizeItem(hidden, []), { kind: "money", amountCents: 500 }, true)).toMatchObject({ reason: "hidden" });
  const full = money(1000);
  expect(checkPledge(full, summarizeItem(full, [give(1000)]), { kind: "money", amountCents: 100 }, true)).toMatchObject({ reason: "complete" });
  expect(checkPledge(units(3), summarizeItem(units(3), []), { kind: "money", amountCents: 500 }, true)).toMatchObject({ reason: "wrong-kind" });
  expect(checkPledge(units(3), summarizeItem(units(3), []), { kind: "whole" }, true)).toMatchObject({ reason: "wrong-kind" });
});

test("com promessa, a mãe não troca o tipo nem baixa a meta abaixo do prometido", () => {
  const item = money(120000);
  const summary = summarizeItem(item, [give(45000)]);
  expect(checkItemChange(item, summary, { kind: "units", goalCents: null, goalUnits: 3 })).toEqual({ ok: false, reason: "kind-locked" });
  expect(checkItemChange(item, summary, { kind: "money", goalCents: 44999, goalUnits: null })).toEqual({ ok: false, reason: "goal-below-committed" });
  expect(checkItemChange(item, summary, { kind: "money", goalCents: 45000, goalUnits: null })).toEqual({ ok: true });
  expect(checkItemChange(item, summarizeItem(item, []), { kind: "single", goalCents: null, goalUnits: null })).toEqual({ ok: true });
});
