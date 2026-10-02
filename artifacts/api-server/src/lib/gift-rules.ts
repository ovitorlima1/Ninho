/**
 * Regra das listas de presentes, sem banco: quanto já foi prometido, quanto
 * falta e o que um convidado ainda pode fazer num item. As rotas só aplicam
 * isto dentro de uma transação com o item travado.
 */
import { MIN_PLEDGE_CENTS, type GiftItemKind, type GiftPledgeKind, type GiftPledgeStatus } from "@workspace/db/schema";

export type RuleItem = {
  kind: GiftItemKind | string;
  goalCents: number | null;
  goalUnits: number | null;
  allowWhole: boolean;
  hidden: boolean;
};

export type RulePledge = {
  kind: GiftPledgeKind | string;
  status: GiftPledgeStatus | string;
  amountCents: number | null;
  units: number | null;
};

/** `open` disponível · `progress` em andamento · `complete` meta fechada · `whole` alguém assumiu o item inteiro. */
export type ItemState = "open" | "progress" | "complete" | "whole";

export type ItemSummary = {
  state: ItemState;
  /** Meta na unidade do item (centavos ou unidades); 0 em item de uma pessoa. */
  goal: number;
  /** Prometido + recebido. Conta para "quanto falta", para ninguém dar em dobro. */
  committed: number;
  /** Só o que a mãe confirmou. */
  confirmed: number;
  remaining: number;
  /** Promessas ativas (prometidas ou confirmadas). */
  active: number;
};

const isActive = (pledge: RulePledge) => pledge.status === "promised" || pledge.status === "confirmed";

export function summarizeItem(item: RuleItem, pledges: RulePledge[]): ItemSummary {
  const active = pledges.filter(isActive);
  const whole = active.find((pledge) => pledge.kind === "whole");
  const goal = item.kind === "money" ? item.goalCents ?? 0 : item.kind === "units" ? item.goalUnits ?? 0 : 0;

  if (whole) {
    const done = whole.status === "confirmed" ? goal : 0;
    return { state: "whole", goal, committed: goal, confirmed: done, remaining: 0, active: active.length };
  }
  if (item.kind === "single") {
    return { state: "open", goal: 0, committed: 0, confirmed: 0, remaining: 0, active: 0 };
  }

  const amount = (pledge: RulePledge) => (item.kind === "money" ? pledge.amountCents ?? 0 : pledge.units ?? 0);
  const committed = active.reduce((sum, pledge) => sum + amount(pledge), 0);
  const confirmed = active.filter((pledge) => pledge.status === "confirmed").reduce((sum, pledge) => sum + amount(pledge), 0);
  const remaining = Math.max(goal - committed, 0);
  const state: ItemState = remaining === 0 && goal > 0 ? "complete" : committed > 0 ? "progress" : "open";
  return { state, goal, committed, confirmed, remaining, active: active.length };
}

export type PledgeRequest = {
  kind: GiftPledgeKind;
  amountCents?: number;
  units?: number;
  wholeMode?: "bring" | "pix";
};

export type PledgeCheck =
  | { ok: true }
  | { ok: false; reason: "hidden" | "taken" | "complete" | "wrong-kind" | "too-low" | "too-high" | "whole-unavailable" | "pix-missing"; remaining: number };

/** O convidado pode fazer este pedido neste item agora? */
export function checkPledge(item: RuleItem, summary: ItemSummary, request: PledgeRequest, pixReady: boolean): PledgeCheck {
  const no = (reason: Exclude<PledgeCheck, { ok: true }>["reason"]): PledgeCheck => ({ ok: false, reason, remaining: summary.remaining });
  if (item.hidden) return no("hidden");
  if (summary.state === "whole") return no("taken");
  if (summary.state === "complete") return no("complete");

  if (request.kind === "whole") {
    // Item inteiro só enquanto ninguém participou (LP-R24/R25).
    if (summary.active > 0) return no("whole-unavailable");
    if (item.kind === "units") return no("wrong-kind");
    if (item.kind === "money") {
      if (!item.allowWhole) return no("whole-unavailable");
      if (request.wholeMode !== "bring" && request.wholeMode !== "pix") return no("wrong-kind");
      if (request.wholeMode === "pix" && !pixReady) return no("pix-missing");
    }
    return { ok: true };
  }

  if (request.kind === "money") {
    if (item.kind !== "money") return no("wrong-kind");
    if (!pixReady) return no("pix-missing");
    const amount = request.amountCents ?? 0;
    if (amount < MIN_PLEDGE_CENTS) return no("too-low");
    if (amount > summary.remaining) return no("too-high");
    return { ok: true };
  }

  if (item.kind !== "units") return no("wrong-kind");
  const units = request.units ?? 0;
  if (units < 1) return no("too-low");
  if (units > summary.remaining) return no("too-high");
  return { ok: true };
}

/** A mãe pode mudar a meta ou o tipo? Não abaixo do que já foi prometido (LP-R10). */
export function checkItemChange(
  current: RuleItem,
  summary: ItemSummary,
  next: { kind: string; goalCents: number | null; goalUnits: number | null },
): { ok: true } | { ok: false; reason: "kind-locked" | "goal-below-committed" } {
  if (summary.active === 0) return { ok: true };
  if (next.kind !== current.kind) return { ok: false, reason: "kind-locked" };
  if (summary.state === "whole") return { ok: true };
  const goal = current.kind === "money" ? next.goalCents ?? 0 : current.kind === "units" ? next.goalUnits ?? 0 : 0;
  if (current.kind !== "single" && goal < summary.committed) return { ok: false, reason: "goal-below-committed" };
  return { ok: true };
}
