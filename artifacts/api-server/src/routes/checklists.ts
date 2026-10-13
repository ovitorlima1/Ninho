import { Router, type Request, type Response } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  checklistCategories,
  checklistItems,
  checklists,
  createChecklistCategorySchema,
  createChecklistSchema,
  giftReservations,
  MAX_CHECKLIST_CATEGORIES,
  MAX_CHECKLISTS,
  updateChecklistCategorySchema,
  updateChecklistSchema,
  type Checklist,
  type ChecklistCategory,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/requireAuth";
import { isNameTaken, nextTone } from "../lib/checklist-rules";
import { createChecklistFromTemplate, listChecklists } from "../lib/checklist-store";
import { firstIssueMessage } from "../lib/validation";

const router = Router();
router.use(requireAuth);

const LIST_NOT_FOUND = "Não encontramos essa lista. Atualize a página e tente de novo.";
const CATEGORY_NOT_FOUND = "Não encontramos essa categoria. Atualize a página e tente de novo.";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function idParam(req: Request, name: string): number | null {
  const raw = req.params[name];
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fail(req: Request, res: Response, err: unknown, context: string, message: string): void {
  req.log.error({ err }, context);
  res.status(500).json({ error: message });
}

/** Serializa as mudanças de estrutura da conta: limite, nome repetido e "última que sobra" valem de verdade. */
function lockAccount(tx: Tx, userId: string) {
  return tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`checklists:${userId}`}))`);
}

async function findList(tx: Tx, userId: string, listId: number): Promise<Checklist | undefined> {
  const [list] = await tx.select().from(checklists).where(and(eq(checklists.id, listId), eq(checklists.userId, userId)));
  return list;
}

function categoriesOf(tx: Tx, userId: string, listId: number): Promise<ChecklistCategory[]> {
  return tx.select().from(checklistCategories)
    .where(and(eq(checklistCategories.listId, listId), eq(checklistCategories.userId, userId)))
    .orderBy(checklistCategories.sortOrder, checklistCategories.id);
}

/** Apaga itens e, com eles, as reservas de presente feitas pelo link público. */
async function deleteItems(tx: Tx, userId: string, where: ReturnType<typeof eq>): Promise<void> {
  const doomed = await tx.select({ id: checklistItems.id }).from(checklistItems)
    .where(and(eq(checklistItems.userId, userId), where));
  if (doomed.length === 0) return;
  const ids = doomed.map((item) => item.id);
  await tx.delete(giftReservations).where(and(eq(giftReservations.userId, userId), inArray(giftReservations.checklistItemId, ids)));
  await tx.delete(checklistItems).where(and(eq(checklistItems.userId, userId), inArray(checklistItems.id, ids)));
}

// ─── Listas ──────────────────────────────────────────────────────────────────

/** POST /api/me/checklists — cria a lista já com as categorias e os itens do modelo. */
router.post("/checklists", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = createChecklistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const created = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      const lists = await listChecklists(tx, userId);
      if (lists.length >= MAX_CHECKLISTS) return null;
      const sortOrder = Math.max(-1, ...lists.map((list) => list.sortOrder)) + 1;
      return createChecklistFromTemplate(tx, userId, parsed.data.template, parsed.data.name, sortOrder);
    });
    if (!created) {
      res.status(409).json({ error: `Você chegou ao limite de ${MAX_CHECKLISTS} listas. Exclua uma para criar outra.` });
      return;
    }
    res.status(201).json(created);
  } catch (err) {
    fail(req, res, err, "checklist create error", "Não foi possível criar a lista agora.");
  }
});

/** PATCH /api/me/checklists/:id — renomeia a lista ou fecha o aviso de sugestões. */
router.patch("/checklists/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = idParam(req, "id");
  if (!id) { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
  const parsed = updateChecklistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const [updated] = await db.update(checklists)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
    res.json(updated);
  } catch (err) {
    fail(req, res, err, "checklist update error", "Não foi possível salvar a lista agora.");
  }
});

/** DELETE /api/me/checklists/:id — apaga a lista com as categorias e os itens; a última fica. */
router.delete("/checklists/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = idParam(req, "id");
  if (!id) { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      const lists = await listChecklists(tx, userId);
      if (!lists.some((list) => list.id === id)) return "missing" as const;
      if (lists.length === 1) return "last" as const;
      await deleteItems(tx, userId, eq(checklistItems.listId, id));
      await tx.delete(checklistCategories).where(and(eq(checklistCategories.listId, id), eq(checklistCategories.userId, userId)));
      await tx.delete(checklists).where(and(eq(checklists.id, id), eq(checklists.userId, userId)));
      return "deleted" as const;
    });
    if (outcome === "missing") { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
    if (outcome === "last") {
      res.status(409).json({ error: "Esta é a sua única lista. Dá para renomear, mas não excluir." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "checklist delete error", "Não foi possível excluir a lista agora. Nada foi apagado.");
  }
});

// ─── Categorias ──────────────────────────────────────────────────────────────

/** POST /api/me/checklists/:id/categories — categoria nova, vazia, no fim da fila. */
router.post("/checklists/:id/categories", async (req, res) => {
  const userId = res.locals.userId as string;
  const listId = idParam(req, "id");
  if (!listId) { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
  const parsed = createChecklistCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      if (!(await findList(tx, userId, listId))) return { kind: "missing" as const };
      const siblings = await categoriesOf(tx, userId, listId);
      if (siblings.length >= MAX_CHECKLIST_CATEGORIES) return { kind: "full" as const };
      if (isNameTaken(parsed.data.name, siblings)) return { kind: "taken" as const };
      const [category] = await tx.insert(checklistCategories).values({
        userId,
        listId,
        name: parsed.data.name,
        icon: parsed.data.icon,
        tone: nextTone(siblings.length),
        sortOrder: Math.max(-1, ...siblings.map((sibling) => sibling.sortOrder)) + 1,
      }).returning();
      return { kind: "created" as const, category: category! };
    });
    if (outcome.kind === "missing") { res.status(404).json({ error: LIST_NOT_FOUND }); return; }
    if (outcome.kind === "full") {
      res.status(409).json({ error: `Esta lista chegou ao limite de ${MAX_CHECKLIST_CATEGORIES} categorias. Exclua uma para criar outra.` });
      return;
    }
    if (outcome.kind === "taken") {
      res.status(409).json({ error: "Já existe uma categoria com esse nome nesta lista." });
      return;
    }
    res.status(201).json(outcome.category);
  } catch (err) {
    fail(req, res, err, "category create error", "Não foi possível criar a categoria agora.");
  }
});

/** PATCH /api/me/checklist-categories/:id — renomeia ou troca o ícone. */
router.patch("/checklist-categories/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = idParam(req, "id");
  if (!id) { res.status(404).json({ error: CATEGORY_NOT_FOUND }); return; }
  const parsed = updateChecklistCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      const [current] = await tx.select().from(checklistCategories)
        .where(and(eq(checklistCategories.id, id), eq(checklistCategories.userId, userId)));
      if (!current) return { kind: "missing" as const };
      const { name } = parsed.data;
      if (name !== undefined && isNameTaken(name, await categoriesOf(tx, userId, current.listId), id)) {
        return { kind: "taken" as const };
      }
      const [category] = await tx.update(checklistCategories)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(checklistCategories.id, id), eq(checklistCategories.userId, userId)))
        .returning();
      // O nome também fica no item: é o que o link público e a exportação leem (LC-R15).
      if (name !== undefined && name !== current.name) {
        await tx.update(checklistItems).set({ category: name })
          .where(and(eq(checklistItems.categoryId, id), eq(checklistItems.userId, userId)));
      }
      return { kind: "updated" as const, category: category! };
    });
    if (outcome.kind === "missing") { res.status(404).json({ error: CATEGORY_NOT_FOUND }); return; }
    if (outcome.kind === "taken") {
      res.status(409).json({ error: "Já existe uma categoria com esse nome nesta lista." });
      return;
    }
    res.json(outcome.category);
  } catch (err) {
    fail(req, res, err, "category update error", "Não foi possível salvar a categoria agora.");
  }
});

/**
 * DELETE /api/me/checklist-categories/:id — `?moveTo=<id>` leva os itens para outra categoria da
 * mesma lista; `?items=delete` apaga junto. Com itens e sem essa escolha, nada acontece (LC-R10).
 */
router.delete("/checklist-categories/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = idParam(req, "id");
  if (!id) { res.status(404).json({ error: CATEGORY_NOT_FOUND }); return; }
  const moveTo = typeof req.query.moveTo === "string" ? Number(req.query.moveTo) : null;
  const deleteWithItems = req.query.items === "delete";
  if (moveTo !== null && (!Number.isInteger(moveTo) || moveTo <= 0 || moveTo === id)) {
    res.status(400).json({ error: "Escolha outra categoria desta lista para receber os itens." });
    return;
  }
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockAccount(tx, userId);
      const [current] = await tx.select().from(checklistCategories)
        .where(and(eq(checklistCategories.id, id), eq(checklistCategories.userId, userId)));
      if (!current) return { kind: "missing" as const };
      const siblings = (await categoriesOf(tx, userId, current.listId)).filter((category) => category.id !== id);
      if (siblings.length === 0) return { kind: "last" as const };

      const items = await tx.select({ id: checklistItems.id }).from(checklistItems)
        .where(and(eq(checklistItems.categoryId, id), eq(checklistItems.userId, userId)));
      if (items.length > 0) {
        if (moveTo !== null) {
          const target = siblings.find((category) => category.id === moveTo);
          if (!target) return { kind: "bad-target" as const };
          await tx.update(checklistItems).set({ categoryId: target.id, category: target.name, updatedAt: new Date() })
            .where(and(eq(checklistItems.categoryId, id), eq(checklistItems.userId, userId)));
        } else if (deleteWithItems) {
          await deleteItems(tx, userId, eq(checklistItems.categoryId, id));
        } else {
          return { kind: "has-items" as const, itemCount: items.length };
        }
      }
      await tx.delete(checklistCategories).where(and(eq(checklistCategories.id, id), eq(checklistCategories.userId, userId)));
      return { kind: "deleted" as const };
    });
    if (outcome.kind === "missing") { res.status(404).json({ error: CATEGORY_NOT_FOUND }); return; }
    if (outcome.kind === "last") {
      res.status(409).json({ error: "Esta é a única categoria da lista. Dá para renomear, mas não excluir." });
      return;
    }
    if (outcome.kind === "bad-target") {
      res.status(400).json({ error: "Escolha outra categoria desta lista para receber os itens." });
      return;
    }
    if (outcome.kind === "has-items") {
      const { itemCount } = outcome;
      res.status(409).json({
        error: `Esta categoria tem ${itemCount} ${itemCount === 1 ? "item" : "itens"}. Escolha para onde ${itemCount === 1 ? "ele vai" : "eles vão"}.`,
        itemCount,
      });
      return;
    }
    res.status(204).send();
  } catch (err) {
    fail(req, res, err, "category delete error", "Não foi possível excluir a categoria agora. Nada foi apagado.");
  }
});

export default router;
