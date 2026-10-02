import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  createGiftItemSchema,
  createGiftListSchema,
  giftListItems,
  giftLists,
  giftPledges,
  MAX_GIFT_LIST_ITEMS,
  MAX_GIFT_LISTS,
  pixAccounts,
  reorderGiftItemsSchema,
  updateGiftItemSchema,
  updateGiftListSchema,
  updatePledgeStatusSchema,
  upsertPixAccountSchema,
  type GiftList,
  type GiftListItem,
  type GiftPledge,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/requireAuth";
import { checkItemChange, summarizeItem } from "../lib/gift-rules";
import { GIFT_TEMPLATES } from "../lib/gift-templates";
import { buildPixPayload, maskPixKey, normalizePixKey, sanitizePixText, type PixKeyType } from "../lib/pix";
import { firstIssueMessage } from "../lib/validation";

const router = Router();
router.use(requireAuth);

const NOT_FOUND = "Não encontramos essa lista.";

function idParam(req: Request, name: string): number | null {
  const raw = req.params[name];
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function ownerPledge(pledge: GiftPledge) {
  const { userId: _owner, manageTokenHash: _hash, ...rest } = pledge;
  return rest;
}

function ownerItem(item: GiftListItem, pledges: GiftPledge[]) {
  const { userId: _owner, ...rest } = item;
  return { ...rest, summary: summarizeItem(item, pledges) };
}

function ownerList(list: GiftList, items: GiftListItem[], pledges: GiftPledge[]) {
  const { userId: _owner, ...rest } = list;
  const byItem = new Map<number, GiftPledge[]>();
  for (const pledge of pledges) byItem.set(pledge.itemId, [...(byItem.get(pledge.itemId) ?? []), pledge]);
  return { ...rest, items: items.map((item) => ownerItem(item, byItem.get(item.id) ?? [])) };
}

/** Item no formato do banco a partir do pedido, com a meta coerente com o tipo. */
function normalizeGoal<T extends { kind: string; goalCents?: number | null; goalUnits?: number | null; unitLabel?: string }>(item: T) {
  return {
    goalCents: item.kind === "money" ? item.goalCents ?? null : null,
    goalUnits: item.kind === "units" ? item.goalUnits ?? null : null,
    unitLabel: item.kind === "units" ? item.unitLabel || "unidades" : "unidades",
  };
}

async function findList(userId: string, listId: number): Promise<GiftList | undefined> {
  const [list] = await db.select().from(giftLists).where(and(eq(giftLists.id, listId), eq(giftLists.userId, userId)));
  return list;
}

function fail(req: Request, res: Response, err: unknown, context: string, message: string): void {
  req.log.error({ err }, context);
  res.status(500).json({ error: message });
}

// ─── Listas ──────────────────────────────────────────────────────────────────

/** GET /api/me/lists — listas da conta, com o progresso de cada uma. */
router.get("/lists", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const lists = await db.select().from(giftLists).where(eq(giftLists.userId, userId)).orderBy(asc(giftLists.createdAt));
    const ids = lists.map((list) => list.id);
    const [items, pledges] = ids.length
      ? await Promise.all([
          db.select().from(giftListItems).where(inArray(giftListItems.listId, ids)),
          db.select().from(giftPledges).where(inArray(giftPledges.listId, ids)),
        ])
      : [[], []];
    res.json({
      lists: lists.map((list) => {
        const visible = items.filter((item) => item.listId === list.id && !item.hidden);
        const summaries = visible.map((item) => summarizeItem(item, pledges.filter((pledge) => pledge.itemId === item.id)));
        const { userId: _owner, token: _token, ...rest } = list;
        return {
          ...rest,
          itemCount: visible.length,
          doneCount: summaries.filter((summary) => summary.state === "complete" || summary.state === "whole").length,
          pledgeCount: summaries.reduce((sum, summary) => sum + summary.active, 0),
        };
      }),
      limit: MAX_GIFT_LISTS,
    });
  } catch (err) {
    fail(req, res, err, "gift lists error", "Não foi possível carregar suas listas agora.");
  }
});

/** POST /api/me/lists — cria a lista já com os itens do modelo. */
router.post("/lists", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = createGiftListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Escolha um modelo para a lista." });
    return;
  }
  const template = GIFT_TEMPLATES[parsed.data.template];
  try {
    const created = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: giftLists.id }).from(giftLists).where(eq(giftLists.userId, userId));
      if (existing.length >= MAX_GIFT_LISTS) return null;
      const [list] = await tx.insert(giftLists).values({
        userId,
        name: parsed.data.name || template.name,
        template: parsed.data.template,
        token: randomBytes(32).toString("base64url"),
      }).returning();
      if (!list) throw new Error("gift list insert returned no row");
      if (template.items.length > 0) {
        await tx.insert(giftListItems).values(template.items.map((item, index) => ({
          listId: list.id,
          userId,
          name: item.name,
          kind: item.kind,
          ...normalizeGoal(item),
          note: item.note ?? null,
          sortOrder: index,
        })));
      }
      return list;
    });
    if (!created) {
      res.status(409).json({ error: `Você pode ter até ${MAX_GIFT_LISTS} listas. Exclua uma para criar outra.` });
      return;
    }
    res.status(201).json({ id: created.id });
  } catch (err) {
    fail(req, res, err, "gift list create error", "Não foi possível criar a lista agora.");
  }
});

/** GET /api/me/lists/:id — a lista com itens, resumo de cada item e contribuições. */
router.get("/lists/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  try {
    const list = listId ? await findList(userId, listId) : undefined;
    if (!list) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    const [items, pledges, [pix]] = await Promise.all([
      db.select().from(giftListItems).where(eq(giftListItems.listId, list.id)).orderBy(asc(giftListItems.sortOrder), asc(giftListItems.id)),
      db.select().from(giftPledges).where(eq(giftPledges.listId, list.id)).orderBy(asc(giftPledges.createdAt)),
      db.select({ userId: pixAccounts.userId }).from(pixAccounts).where(eq(pixAccounts.userId, userId)),
    ]);
    res.json({
      list: ownerList(list, items, pledges),
      pledges: pledges.map(ownerPledge),
      pixReady: Boolean(pix),
      itemLimit: MAX_GIFT_LIST_ITEMS,
    });
  } catch (err) {
    fail(req, res, err, "gift list detail error", "Não foi possível carregar a lista agora.");
  }
});

/** PATCH /api/me/lists/:id — nome, dados do evento e mensagem. */
router.patch("/lists/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const parsed = updateGiftListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const [updated] = listId
      ? await db.update(giftLists).set({ ...parsed.data, updatedAt: new Date() })
          .where(and(eq(giftLists.id, listId), eq(giftLists.userId, userId))).returning({ id: giftLists.id })
      : [];
    if (!updated) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    res.json({ id: updated.id });
  } catch (err) {
    fail(req, res, err, "gift list update error", "Não foi possível salvar a lista agora.");
  }
});

/** DELETE /api/me/lists/:id — apaga a lista com itens e contribuições. */
router.delete("/lists/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  try {
    const deleted = listId
      ? await db.transaction(async (tx) => {
          const [list] = await tx.delete(giftLists).where(and(eq(giftLists.id, listId), eq(giftLists.userId, userId))).returning({ id: giftLists.id });
          if (!list) return false;
          await tx.delete(giftPledges).where(eq(giftPledges.listId, list.id));
          await tx.delete(giftListItems).where(eq(giftListItems.listId, list.id));
          return true;
        })
      : false;
    if (!deleted) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "gift list delete error", "Não foi possível excluir a lista agora.");
  }
});

// ─── Itens ───────────────────────────────────────────────────────────────────

/** POST /api/me/lists/:id/items */
router.post("/lists/:id/items", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const parsed = createGiftItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const list = listId ? await findList(userId, listId) : undefined;
    if (!list) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    const existing = await db.select({ sortOrder: giftListItems.sortOrder }).from(giftListItems).where(eq(giftListItems.listId, list.id));
    if (existing.length >= MAX_GIFT_LIST_ITEMS) {
      res.status(409).json({ error: `Uma lista pode ter até ${MAX_GIFT_LIST_ITEMS} presentes.` });
      return;
    }
    const { data } = parsed;
    const [item] = await db.insert(giftListItems).values({
      listId: list.id,
      userId,
      name: data.name,
      kind: data.kind,
      ...normalizeGoal(data),
      referenceCents: data.kind === "single" ? data.referenceCents ?? null : null,
      note: data.note ?? null,
      similarOk: data.similarOk ?? false,
      storeUrl: data.storeUrl ?? null,
      allowWhole: data.allowWhole ?? true,
      hidden: data.hidden ?? false,
      sortOrder: Math.max(-1, ...existing.map((row) => row.sortOrder)) + 1,
    }).returning();
    if (!item) throw new Error("gift item insert returned no row");
    res.status(201).json({ item: ownerItem(item, []) });
  } catch (err) {
    fail(req, res, err, "gift item create error", "Não foi possível adicionar o presente agora.");
  }
});

/** PATCH /api/me/lists/:id/items/:itemId — com promessa, o tipo trava e a meta não cai abaixo do prometido. */
router.patch("/lists/:id/items/:itemId", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const itemId = idParam(req, "itemId");
  const parsed = updateGiftItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [current] = listId && itemId
        ? await tx.select().from(giftListItems)
            .where(and(eq(giftListItems.id, itemId), eq(giftListItems.listId, listId), eq(giftListItems.userId, userId)))
            .for("update")
        : [];
      if (!current) return { kind: "missing" as const };
      const pledges = await tx.select().from(giftPledges).where(eq(giftPledges.itemId, current.id));
      const { data } = parsed;
      const kind = data.kind ?? current.kind;
      const merged = {
        kind,
        goalCents: data.goalCents !== undefined ? data.goalCents : current.goalCents,
        goalUnits: data.goalUnits !== undefined ? data.goalUnits : current.goalUnits,
        unitLabel: data.unitLabel ?? current.unitLabel,
      };
      const goal = normalizeGoal(merged);
      if (kind === "money" && !goal.goalCents) return { kind: "invalid" as const, message: "Informe o valor total do presente." };
      if (kind === "units" && !goal.goalUnits) return { kind: "invalid" as const, message: "Informe a quantidade." };

      const change = checkItemChange(current, summarizeItem(current, pledges), { kind, ...goal });
      if (!change.ok) {
        return {
          kind: "locked" as const,
          message: change.reason === "kind-locked"
            ? "Este presente já tem contribuições, então o tipo não pode mudar."
            : "A meta não pode ficar abaixo do que já foi prometido ou recebido.",
        };
      }
      const [item] = await tx.update(giftListItems).set({
        name: data.name ?? current.name,
        kind,
        ...goal,
        referenceCents: kind === "single" ? (data.referenceCents !== undefined ? data.referenceCents : current.referenceCents) : null,
        note: data.note !== undefined ? data.note : current.note,
        similarOk: data.similarOk ?? current.similarOk,
        storeUrl: data.storeUrl !== undefined ? data.storeUrl : current.storeUrl,
        allowWhole: data.allowWhole ?? current.allowWhole,
        hidden: data.hidden ?? current.hidden,
        updatedAt: new Date(),
      }).where(eq(giftListItems.id, current.id)).returning();
      return { kind: "ok" as const, item: item!, pledges };
    });
    if (result.kind === "missing") {
      res.status(404).json({ error: "Não encontramos esse presente." });
      return;
    }
    if (result.kind === "invalid") {
      res.status(400).json({ error: result.message });
      return;
    }
    if (result.kind === "locked") {
      res.status(409).json({ error: result.message });
      return;
    }
    res.json({ item: ownerItem(result.item, result.pledges) });
  } catch (err) {
    fail(req, res, err, "gift item update error", "Não foi possível salvar o presente agora.");
  }
});

/** DELETE /api/me/lists/:id/items/:itemId — apaga o presente e as contribuições dele. */
router.delete("/lists/:id/items/:itemId", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const itemId = idParam(req, "itemId");
  try {
    const deleted = listId && itemId
      ? await db.transaction(async (tx) => {
          const [item] = await tx.delete(giftListItems)
            .where(and(eq(giftListItems.id, itemId), eq(giftListItems.listId, listId), eq(giftListItems.userId, userId)))
            .returning({ id: giftListItems.id });
          if (!item) return false;
          await tx.delete(giftPledges).where(eq(giftPledges.itemId, item.id));
          return true;
        })
      : false;
    if (!deleted) {
      res.status(404).json({ error: "Não encontramos esse presente." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "gift item delete error", "Não foi possível remover o presente agora.");
  }
});

/** PUT /api/me/lists/:id/items/order — nova ordem dos presentes. */
router.put("/lists/:id/items/order", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const parsed = reorderGiftItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ordem inválida." });
    return;
  }
  try {
    const list = listId ? await findList(userId, listId) : undefined;
    if (!list) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    await db.transaction(async (tx) => {
      for (const [index, id] of parsed.data.ids.entries()) {
        await tx.update(giftListItems).set({ sortOrder: index })
          .where(and(eq(giftListItems.id, id), eq(giftListItems.listId, list.id)));
      }
    });
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "gift item reorder error", "Não foi possível reordenar agora.");
  }
});

// ─── Contribuições ───────────────────────────────────────────────────────────

/**
 * PATCH /api/me/lists/:id/pledges/:pledgeId — "Recebi" (confirma), desfazer a
 * confirmação (volta a prometida) ou desfazer a promessa (cancela e devolve o saldo).
 */
router.patch("/lists/:id/pledges/:pledgeId", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  const pledgeId = idParam(req, "pledgeId");
  const parsed = updatePledgeStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Escolha o que fazer com esta contribuição." });
    return;
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [pledge] = listId && pledgeId
        ? await tx.select().from(giftPledges)
            .where(and(eq(giftPledges.id, pledgeId), eq(giftPledges.listId, listId), eq(giftPledges.userId, userId)))
            .for("update")
        : [];
      if (!pledge) return { kind: "missing" as const };
      // Uma promessa cancelada não volta: o saldo pode já ter sido dado a outra pessoa.
      if (pledge.status === "cancelled") return { kind: "cancelled" as const };
      const { status } = parsed.data;
      const [updated] = await tx.update(giftPledges).set({
        status,
        confirmedAt: status === "confirmed" ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(giftPledges.id, pledge.id)).returning();
      return { kind: "ok" as const, pledge: updated! };
    });
    if (result.kind === "missing") {
      res.status(404).json({ error: "Não encontramos essa contribuição." });
      return;
    }
    if (result.kind === "cancelled") {
      res.status(409).json({ error: "Esta contribuição já foi desfeita." });
      return;
    }
    res.json({ pledge: ownerPledge(result.pledge) });
  } catch (err) {
    fail(req, res, err, "gift pledge update error", "Não foi possível atualizar a contribuição agora.");
  }
});

// ─── Pix ─────────────────────────────────────────────────────────────────────

/** GET /api/me/pix — a conta Pix da mãe (a chave é dela, então vai inteira). */
router.get("/pix", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [pix] = await db.select().from(pixAccounts).where(eq(pixAccounts.userId, userId));
    res.json({
      pix: pix
        ? { key: pix.key, keyType: pix.keyType, keyMasked: maskPixKey(pix.key, pix.keyType as PixKeyType), recipientName: pix.recipientName, city: pix.city }
        : null,
    });
  } catch (err) {
    fail(req, res, err, "pix read error", "Não foi possível carregar sua chave Pix agora.");
  }
});

/** PUT /api/me/pix — cadastra ou troca a chave, o nome do recebedor e a cidade. */
router.put("/pix", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = upsertPixAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const normalized = normalizePixKey(parsed.data.key);
  if (!normalized) {
    res.status(400).json({ error: "Não reconhecemos essa chave Pix. Use CPF, celular, e-mail ou chave aleatória.", field: "key" });
    return;
  }
  const recipientName = sanitizePixText(parsed.data.recipientName, 25);
  const city = sanitizePixText(parsed.data.city, 15);
  if (recipientName.length < 2 || city.length < 2) {
    res.status(400).json({ error: "Informe o nome de quem recebe e a cidade, só com letras." });
    return;
  }
  try {
    const values = { key: normalized.key, keyType: normalized.type, recipientName, city, updatedAt: new Date() };
    await db.insert(pixAccounts).values({ userId, ...values })
      .onConflictDoUpdate({ target: pixAccounts.userId, set: values });
    res.json({ pix: { key: values.key, keyType: values.keyType, keyMasked: maskPixKey(values.key, values.keyType), recipientName, city } });
  } catch (err) {
    fail(req, res, err, "pix save error", "Não foi possível salvar sua chave Pix agora.");
  }
});

/** DELETE /api/me/pix — sem chave, os convidados deixam de poder contribuir com valor. */
router.delete("/pix", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    await db.delete(pixAccounts).where(eq(pixAccounts.userId, userId));
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "pix delete error", "Não foi possível remover sua chave Pix agora.");
  }
});

/** GET /api/me/pix/test — Pix de R$ 0,01 para a mãe conferir a chave no próprio banco. */
router.get("/pix/test", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [pix] = await db.select().from(pixAccounts).where(eq(pixAccounts.userId, userId));
    if (!pix) {
      res.status(404).json({ error: "Cadastre sua chave Pix primeiro." });
      return;
    }
    res.json({
      payload: buildPixPayload({ key: pix.key, name: pix.recipientName, city: pix.city, amountCents: 1, txid: "NINHOTESTE" }),
      amountCents: 1,
      recipientName: pix.recipientName,
    });
  } catch (err) {
    fail(req, res, err, "pix test error", "Não foi possível gerar o Pix de teste agora.");
  }
});

export default router;
