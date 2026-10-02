import { randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cancelPledgeSchema,
  createPledgeSchema,
  giftListItems,
  giftLists,
  giftPledges,
  lookupPledgesSchema,
  minePledgeSchema,
  pixAccounts,
  profiles,
  type GiftListItem,
  type GiftPledge,
  type PixAccount,
} from "@workspace/db/schema";
import { createPasswordResetToken, hashPasswordResetToken } from "../lib/auth";
import { checkPledge, summarizeItem, type PledgeCheck } from "../lib/gift-rules";
import { buildPixPayload, maskPixKey, type PixKeyType } from "../lib/pix";
import { giftReservationLimiter, limiterKey } from "../lib/rate-limit";

const router = Router();

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INVALID_LINK = "Esta lista não existe ou o link mudou.";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function listToken(req: Request): string | null {
  const raw = req.params.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Identificador do Pix: só letras e números fáceis de ler no extrato. */
function createPledgeCode(): string {
  const bytes = randomBytes(10);
  return `NINHO${[...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`;
}

function storeDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Item como o convidado vê: progresso e estado, nunca quem deu nem quanto cada
 * pessoa deu. O nome só aparece em item inteiro, e se a pessoa deixou (LP-R18).
 */
function publicItem(item: GiftListItem, pledges: GiftPledge[]) {
  const summary = summarizeItem(item, pledges);
  const whole = pledges.find((pledge) => pledge.kind === "whole" && pledge.status !== "cancelled");
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    unitLabel: item.unitLabel,
    referenceCents: item.referenceCents,
    note: item.note,
    similarOk: item.similarOk,
    storeUrl: item.storeUrl,
    storeDomain: storeDomain(item.storeUrl),
    state: summary.state,
    goal: summary.goal,
    committed: summary.committed,
    confirmed: summary.confirmed,
    remaining: summary.remaining,
    canWhole: summary.active === 0 && item.kind !== "units" && (item.kind === "single" || item.allowWhole),
    wholeBy: whole && whole.showName && whole.guestName ? whole.guestName : null,
  };
}

function needsPix(pledge: GiftPledge): boolean {
  return pledge.kind === "money" || (pledge.kind === "whole" && pledge.wholeMode === "pix");
}

function pixFor(pledge: GiftPledge, pix: PixAccount | undefined) {
  if (!pix || !needsPix(pledge) || pledge.status !== "promised" || !pledge.amountCents) return null;
  return {
    payload: buildPixPayload({ key: pix.key, name: pix.recipientName, city: pix.city, amountCents: pledge.amountCents, txid: pledge.code }),
    amountCents: pledge.amountCents,
    recipientName: pix.recipientName,
    keyMasked: maskPixKey(pix.key, pix.keyType as PixKeyType),
  };
}

/** A promessa como o próprio convidado vê (com o link de gerenciamento em mãos). */
function guestPledge(pledge: GiftPledge, itemName: string, pix: PixAccount | undefined) {
  return {
    id: pledge.id,
    itemId: pledge.itemId,
    itemName,
    kind: pledge.kind,
    amountCents: pledge.amountCents,
    units: pledge.units,
    wholeMode: pledge.wholeMode,
    guestName: pledge.guestName,
    showName: pledge.showName,
    guestSaysPaid: pledge.guestSaysPaid,
    status: pledge.status,
    createdAt: pledge.createdAt,
    pix: pixFor(pledge, pix),
  };
}

function refusal(check: Exclude<PledgeCheck, { ok: true }>, item: GiftListItem): string {
  switch (check.reason) {
    case "too-high":
      return item.kind === "money"
        ? `Faltam só ${money(check.remaining)} para este presente.`
        : `Faltam só ${check.remaining} ${item.unitLabel}.`;
    case "too-low":
      return item.kind === "money" ? "O valor mínimo é R$ 1,00." : "Escolha pelo menos 1.";
    case "taken":
      return "Alguém acabou de escolher este presente.";
    case "complete":
      return "Este presente acabou de ser completado.";
    case "whole-unavailable":
      return "Este presente já tem contribuições. Você pode completar o que falta.";
    case "pix-missing":
      return "Esta lista ainda não aceita contribuições em valor.";
    default:
      return "Este presente não está disponível.";
  }
}

/** GET /api/lists/:token — a lista para o convidado. Sem chave Pix e sem dados do perfil além do nome. */
router.get("/:token", async (req, res): Promise<void> => {
  const token = listToken(req);
  try {
    const [list] = token ? await db.select().from(giftLists).where(eq(giftLists.token, token)) : [];
    if (!list) {
      res.status(404).json({ error: INVALID_LINK });
      return;
    }
    const [[profile], items, pledges, [pix]] = await Promise.all([
      db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, list.userId)),
      db.select().from(giftListItems)
        .where(and(eq(giftListItems.listId, list.id), eq(giftListItems.hidden, false)))
        .orderBy(asc(giftListItems.sortOrder), asc(giftListItems.id)),
      db.select().from(giftPledges).where(eq(giftPledges.listId, list.id)),
      db.select({ userId: pixAccounts.userId }).from(pixAccounts).where(eq(pixAccounts.userId, list.userId)),
    ]);
    res.json({
      name: list.name,
      ownerName: profile?.displayName || null,
      eventDate: list.eventDate,
      eventTime: list.eventTime,
      eventPlace: list.eventPlace,
      message: list.message,
      pixReady: Boolean(pix),
      items: items.map((item) => publicItem(item, pledges.filter((pledge) => pledge.itemId === item.id))),
    });
  } catch (err) {
    req.log.error({ err }, "public gift list read error");
    res.status(500).json({ error: "Não foi possível carregar esta lista agora." });
  }
});

/**
 * POST /api/lists/:token/pledges — o convidado promete um valor, algumas
 * unidades ou o item inteiro. O item fica travado na transação: duas pessoas
 * disputando o mesmo saldo nunca passam da meta (LP-R22).
 */
router.post("/:token/pledges", async (req, res): Promise<void> => {
  const token = listToken(req);
  const parsed = createPledgeSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(token ? 400 : 404).json({ error: token ? "Escolha um presente e como você quer dar." : INVALID_LINK });
    return;
  }

  // A página é pública: um limite por origem evita que alguém esvazie a lista.
  const origin = req.ip || req.socket.remoteAddress || "unknown";
  const rateLimit = await giftReservationLimiter.consume([limiterKey("gift-pledge:origin", origin)]);
  if (!rateLimit.allowed) {
    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: "Muitas reservas seguidas. Aguarde um pouco antes de tentar de novo.", retryAfterSeconds: rateLimit.retryAfterSeconds });
    return;
  }

  const { data } = parsed;
  try {
    const result = await db.transaction(async (tx) => {
      const [list] = await tx.select().from(giftLists).where(eq(giftLists.token, token));
      if (!list) return { kind: "invalid" as const };
      const [item] = await tx.select().from(giftListItems)
        .where(and(eq(giftListItems.id, data.itemId), eq(giftListItems.listId, list.id)))
        .for("update");
      if (!item) return { kind: "unavailable" as const };
      const [pledges, [pix]] = await Promise.all([
        tx.select().from(giftPledges).where(eq(giftPledges.itemId, item.id)),
        tx.select().from(pixAccounts).where(eq(pixAccounts.userId, list.userId)),
      ]);

      // Em item de uma pessoa o presente é levado em mãos.
      const wholeMode = data.kind === "whole" ? (item.kind === "single" ? "bring" : data.wholeMode) : undefined;
      const check = checkPledge(item, summarizeItem(item, pledges), { ...data, wholeMode }, Boolean(pix));
      if (!check.ok) return { kind: "refused" as const, check, item };

      const { token: manageToken, tokenHash } = createPasswordResetToken();
      const [pledge] = await tx.insert(giftPledges).values({
        listId: list.id,
        itemId: item.id,
        userId: list.userId,
        kind: data.kind,
        amountCents: data.kind === "money" ? data.amountCents! : wholeMode === "pix" ? item.goalCents : null,
        units: data.kind === "units" ? data.units! : null,
        wholeMode: wholeMode ?? null,
        guestName: data.guestName || null,
        showName: data.kind === "whole" ? Boolean(data.showName && data.guestName) : false,
        code: createPledgeCode(),
        manageTokenHash: tokenHash,
      }).returning();
      if (!pledge) throw new Error("gift pledge insert returned no row");
      return { kind: "created" as const, pledge, item, pix, manageToken };
    });

    if (result.kind === "invalid") {
      res.status(404).json({ error: INVALID_LINK });
      return;
    }
    if (result.kind === "unavailable") {
      res.status(409).json({ error: "Este presente não está disponível." });
      return;
    }
    if (result.kind === "refused") {
      res.status(409).json({ error: refusal(result.check, result.item), reason: result.check.reason, remaining: result.check.remaining });
      return;
    }
    res.status(201).json({
      pledge: guestPledge(result.pledge, result.item.name, result.pix),
      manageToken: result.manageToken,
    });
  } catch (err) {
    req.log.error({ err }, "public gift pledge error");
    res.status(500).json({ error: "Não foi possível registrar agora. Tente de novo em instantes." });
  }
});

/** POST /api/lists/:token/pledges/lookup — as reservas do convidado, pelos links que ele guarda. */
router.post("/:token/pledges/lookup", async (req, res): Promise<void> => {
  const token = listToken(req);
  const parsed = lookupPledgesSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(token ? 400 : 404).json({ error: token ? "Pedido inválido." : INVALID_LINK });
    return;
  }
  try {
    const [list] = await db.select().from(giftLists).where(eq(giftLists.token, token));
    if (!list) {
      res.status(404).json({ error: INVALID_LINK });
      return;
    }
    const hashes = parsed.data.tokens.map(hashPasswordResetToken);
    if (hashes.length === 0) {
      res.json({ pledges: [] });
      return;
    }
    const [pledges, items, [pix]] = await Promise.all([
      db.select().from(giftPledges)
        .where(and(eq(giftPledges.listId, list.id), inArray(giftPledges.manageTokenHash, hashes)))
        .orderBy(asc(giftPledges.createdAt)),
      db.select({ id: giftListItems.id, name: giftListItems.name }).from(giftListItems).where(eq(giftListItems.listId, list.id)),
      db.select().from(pixAccounts).where(eq(pixAccounts.userId, list.userId)),
    ]);
    const names = new Map(items.map((item) => [item.id, item.name]));
    // O token volta junto para a página saber qual link gerencia qual reserva.
    const tokenByHash = new Map(parsed.data.tokens.map((value) => [hashPasswordResetToken(value), value]));
    res.json({
      pledges: pledges.map((pledge) => ({
        ...guestPledge(pledge, names.get(pledge.itemId) ?? "Presente", pix),
        manageToken: tokenByHash.get(pledge.manageTokenHash),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "public gift pledge lookup error");
    res.status(500).json({ error: "Não foi possível carregar suas reservas agora." });
  }
});

/** PATCH /api/lists/:token/pledges/mine — "já fiz o Pix": a mãe vê o que o convidado declarou. */
router.patch("/:token/pledges/mine", async (req, res): Promise<void> => {
  const token = listToken(req);
  const parsed = minePledgeSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(token ? 400 : 404).json({ error: token ? "Pedido inválido." : INVALID_LINK });
    return;
  }
  try {
    const [list] = await db.select({ id: giftLists.id }).from(giftLists).where(eq(giftLists.token, token));
    const [updated] = list
      ? await db.update(giftPledges)
          .set({ guestSaysPaid: parsed.data.guestSaysPaid, updatedAt: new Date() })
          .where(and(
            eq(giftPledges.listId, list.id),
            eq(giftPledges.manageTokenHash, hashPasswordResetToken(parsed.data.manageToken)),
            eq(giftPledges.status, "promised"),
          ))
          .returning({ id: giftPledges.id })
      : [];
    if (!updated) {
      res.status(404).json({ error: "Não encontramos essa reserva." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "public gift pledge update error");
    res.status(500).json({ error: "Não foi possível atualizar agora." });
  }
});

/** POST /api/lists/:token/pledges/cancel — o convidado desiste, enquanto a mãe não confirmou (LP-R28). */
router.post("/:token/pledges/cancel", async (req, res): Promise<void> => {
  const token = listToken(req);
  const parsed = cancelPledgeSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(token ? 400 : 404).json({ error: token ? "Pedido inválido." : INVALID_LINK });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [list] = await tx.select({ id: giftLists.id }).from(giftLists).where(eq(giftLists.token, token));
      if (!list) return "missing" as const;
      const [pledge] = await tx.select().from(giftPledges)
        .where(and(eq(giftPledges.listId, list.id), eq(giftPledges.manageTokenHash, hashPasswordResetToken(parsed.data.manageToken))))
        .for("update");
      if (!pledge) return "missing" as const;
      if (pledge.status === "confirmed") return "confirmed" as const;
      if (pledge.status === "promised") {
        await tx.update(giftPledges).set({ status: "cancelled", updatedAt: new Date() }).where(eq(giftPledges.id, pledge.id));
      }
      return "cancelled" as const;
    });
    if (result === "missing") {
      res.status(404).json({ error: "Não encontramos essa reserva." });
      return;
    }
    if (result === "confirmed") {
      res.status(409).json({ error: "Este presente já foi confirmado como recebido. Para mudar, fale com quem criou a lista." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "public gift pledge cancel error");
    res.status(500).json({ error: "Não foi possível cancelar agora." });
  }
});

export default router;
