import { randomBytes } from "node:crypto";
import { Router } from "express";
import { eq, and, desc, isNull, ne, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  profiles,
  checklistCategories,
  checklistItems,
  milestones,
  updateProfileSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  MAX_CHECKLIST_CATEGORIES,
  RECOMMENDATION_CATEGORY_BY_ID,
  updateBudgetSchema,
  toggleMilestoneSchema,
  giftReservations,
  giftShareLinks,
  updateGiftReservationSchema,
  type ChecklistCategory,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/requireAuth";
import { clearsSuggestion, defaultLook, nextTone, normalizeName } from "../lib/checklist-rules";
import { listCategories, listChecklists, migrateLegacyUser, primaryChecklist } from "../lib/checklist-store";
import { ensureUserInitialized } from "../lib/seed";
import { firstIssueMessage } from "../lib/validation";

const router = Router();

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

// All /me routes require auth
router.use(requireAuth);

// ─── Workspace ────────────────────────────────────────────────────────────────

/** GET /api/me/workspace — full user workspace (profile + lists + categories + items + milestones) */
router.get("/workspace", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    // Leitura pura para contas já inicializadas (o seed acontece no cadastro).
    // Contas antigas sem perfil são inicializadas aqui uma única vez; uma
    // lista esvaziada de propósito nunca é repovoada.
    const profile = await ensureUserInitialized(userId);

    // Rede de segurança da varredura feita ao subir: conta de antes das listas é migrada aqui.
    let lists = await listChecklists(db, userId);
    if (lists.length === 0) {
      await migrateLegacyUser(userId);
      lists = await listChecklists(db, userId);
    }

    const [categories, items, userMilestones, reservations] = await Promise.all([
      listCategories(db, userId),
      db.select().from(checklistItems).where(eq(checklistItems.userId, userId)).orderBy(checklistItems.sortOrder, checklistItems.createdAt),
      db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.week),
      db.select().from(giftReservations).where(eq(giftReservations.userId, userId)),
    ]);

    res.json({ profile, lists, categories, items, milestones: userMilestones, giftReservations: reservations });
  } catch (err) {
    req.log.error({ err }, "workspace error");
    res.status(500).json({ error: "Não foi possível carregar seu ninho agora." });
  }
});

// ─── Gift sharing ─────────────────────────────────────────────────────────────

function createGiftToken(): string {
  return randomBytes(32).toString("base64url");
}

/** GET /api/me/share — current public link metadata, if one exists */
router.get("/share", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  const [share] = await db.select().from(giftShareLinks).where(and(
    eq(giftShareLinks.userId, userId),
    isNull(giftShareLinks.revokedAt),
  )).orderBy(desc(giftShareLinks.createdAt)).limit(1);
  res.json(share ?? null);
});

/** POST /api/me/share — revoke any current link and create a fresh one */
router.post("/share", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const share = await db.transaction(async (tx) => {
      // This lock exists even before a share row does, serializing concurrent
      // generations for one owner. The partial unique index is the durable
      // database backstop if another writer ever bypasses this route.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
      const [activeShare] = await tx.select().from(giftShareLinks).where(and(
        eq(giftShareLinks.userId, userId),
        isNull(giftShareLinks.revokedAt),
      )).for("update").limit(1);
      if (activeShare) {
        await tx.update(giftShareLinks)
          .set({ revokedAt: new Date() })
          .where(eq(giftShareLinks.id, activeShare.id));
      }
      const [created] = await tx.insert(giftShareLinks).values({
        userId,
        token: createGiftToken(),
      }).returning();
      return created;
    });
    res.status(201).json(share);
  } catch (err) {
    req.log.error({ err }, "share link create error");
    res.status(500).json({ error: "Não foi possível criar o link agora." });
  }
});

/** DELETE /api/me/share — revoke the current public link */
router.delete("/share", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
      const [activeShare] = await tx.select().from(giftShareLinks).where(and(
        eq(giftShareLinks.userId, userId),
        isNull(giftShareLinks.revokedAt),
      )).for("update").limit(1);
      if (activeShare) {
        await tx.update(giftShareLinks)
          .set({ revokedAt: new Date() })
          .where(eq(giftShareLinks.id, activeShare.id));
      }
    });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "share link revoke error");
    res.status(500).json({ error: "Não foi possível revogar o link agora." });
  }
});

/** PATCH /api/me/gift-reservations/:id — owner correction */
router.patch("/gift-reservations/:id", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Item inválido." }); return; }
  const parsed = updateGiftReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de reserva inválidos." });
    return;
  }
  try {
    const [updated] = await db.update(giftReservations)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(giftReservations.id, id), eq(giftReservations.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Reserva não encontrada." }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "gift reservation update error");
    res.status(500).json({ error: "Não foi possível corrigir a reserva agora." });
  }
});

/** DELETE /api/me/gift-reservations/:id — owner releases an item */
router.delete("/gift-reservations/:id", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Item inválido." }); return; }
  try {
    const [deleted] = await db.delete(giftReservations)
      .where(and(eq(giftReservations.id, id), eq(giftReservations.userId, userId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Reserva não encontrada." }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "gift reservation delete error");
    res.status(500).json({ error: "Não foi possível desfazer a reserva agora." });
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────────

/** PUT /api/me/profile — update profile fields */
router.put("/profile", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Confira os dados informados." });
    return;
  }
  try {
    // Antes criava só o perfil, e a conta nunca recebia os itens padrão.
    await ensureUserInitialized(userId);
    const [updated] = await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "profile update error");
    res.status(500).json({ error: "Não foi possível salvar o perfil agora." });
  }
});

// ─── Checklist ────────────────────────────────────────────────────────────────

/**
 * Categoria que recebe uma inspiração: a de mesmo nome na primeira lista (LC-R25). Se a mãe
 * renomeou ou apagou essa categoria, ela é recriada; no limite de categorias, vai para a primeira.
 */
async function categoryForRecommendation(userId: string, name: string): Promise<ChecklistCategory | undefined> {
  const list = await primaryChecklist(db, userId);
  if (!list) return undefined;
  const categories = (await listCategories(db, userId)).filter((category) => category.listId === list.id);
  const match = categories.find((category) => normalizeName(category.name) === normalizeName(name));
  if (match) return match;
  if (categories.length >= MAX_CHECKLIST_CATEGORIES) return categories[0];
  const look = defaultLook(name) ?? { icon: "heart" as const, tone: nextTone(categories.length) };
  const [created] = await db.insert(checklistCategories).values({
    userId,
    listId: list.id,
    name,
    ...look,
    sortOrder: Math.max(-1, ...categories.map((category) => category.sortOrder)) + 1,
  }).returning();
  return created;
}

/** Categoria da conta pelo id; o que é de outra conta não existe (LC-R27). */
async function findCategory(userId: string, categoryId: number): Promise<ChecklistCategory | undefined> {
  const [category] = await db.select().from(checklistCategories)
    .where(and(eq(checklistCategories.id, categoryId), eq(checklistCategories.userId, userId)));
  return category;
}

/** POST /api/me/checklist — add a new checklist item */
router.post("/checklist", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = createChecklistItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Confira os dados informados." });
    return;
  }
  try {
    const { categoryId, category: categoryName, ...fields } = parsed.data;
    if (fields.recommendationId) {
      const [existing] = await db
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(and(
          eq(checklistItems.userId, userId),
          eq(checklistItems.recommendationId, fields.recommendationId),
        ))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "Esta recomendação já está na sua lista." });
        return;
      }
    }

    let category: ChecklistCategory | undefined;
    if (fields.recommendationId) {
      category = await categoryForRecommendation(userId, RECOMMENDATION_CATEGORY_BY_ID[fields.recommendationId]);
    } else if (categoryId !== undefined) {
      category = await findCategory(userId, categoryId);
    } else if (categoryName) {
      // Front antigo em cache: o nome vale para a primeira lista.
      const list = await primaryChecklist(db, userId);
      category = (await listCategories(db, userId)).find((candidate) =>
        candidate.listId === list?.id && normalizeName(candidate.name) === normalizeName(categoryName));
    } else {
      res.status(400).json({ error: "Escolha uma categoria para o item." });
      return;
    }
    if (!category) {
      res.status(404).json({ error: "Não encontramos essa categoria. Atualize a página e tente de novo." });
      return;
    }

    const [item] = await db
      .insert(checklistItems)
      .values({
        ...fields,
        price: String(fields.price),
        userId,
        listId: category.listId,
        categoryId: category.id,
        category: category.name,
        // O que a mãe adiciona é dela, nunca sugestão (LC-R5).
        suggested: false,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Esta recomendação já está na sua lista." });
      return;
    }
    req.log.error({ err }, "checklist post error");
    res.status(500).json({ error: "Não foi possível adicionar o item agora." });
  }
});

/** PATCH /api/me/checklist/:id — update a checklist item */
router.patch("/checklist/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Item inválido." }); return; }

  const parsed = updateChecklistItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Confira os dados informados." });
    return;
  }
  try {
    const [currentItem] = await db
      .select({ id: checklistItems.id, category: checklistItems.category, listId: checklistItems.listId })
      .from(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
      .limit(1);
    if (!currentItem) {
      res.status(404).json({ error: "Não encontramos esse item. Atualize a página e tente de novo." });
      return;
    }
    let target: ChecklistCategory | undefined;
    if (parsed.data.categoryId !== undefined) {
      target = await findCategory(userId, parsed.data.categoryId);
      // Mover para outra lista fica fora desta feature: a categoria tem de ser da lista do item.
      if (!target || target.listId !== currentItem.listId) {
        res.status(404).json({ error: "Não encontramos essa categoria. Atualize a página e tente de novo." });
        return;
      }
    }
    if (parsed.data.recommendationId) {
      const itemCategory = target?.name ?? currentItem.category;
      if (normalizeName(itemCategory) !== normalizeName(RECOMMENDATION_CATEGORY_BY_ID[parsed.data.recommendationId])) {
        res.status(400).json({ error: "A recomendação precisa pertencer à mesma categoria do item." });
        return;
      }
      const [existing] = await db
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(and(
          eq(checklistItems.userId, userId),
          ne(checklistItems.id, id),
          eq(checklistItems.recommendationId, parsed.data.recommendationId),
        ))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "Esta recomendação já está vinculada a outro item." });
        return;
      }
    }
    const update: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.price !== undefined) update.price = String(parsed.data.price);
    if (target) update.category = target.name;
    if (clearsSuggestion(parsed.data)) update.suggested = false;
    const [updated] = await db
      .update(checklistItems)
      .set(update)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Não encontramos esse item. Atualize a página e tente de novo." }); return; }
    res.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Esta recomendação já está vinculada a outro item." });
      return;
    }
    req.log.error({ err }, "checklist patch error");
    res.status(500).json({ error: "Não foi possível atualizar o item agora." });
  }
});

/** DELETE /api/me/checklist/:id — remove a checklist item */
router.delete("/checklist/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Item inválido." }); return; }

  try {
    const deleted = await db.transaction(async (tx) => {
      const [item] = await tx
        .delete(checklistItems)
        .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
        .returning();
      if (item) {
        await tx.delete(giftReservations).where(and(
          eq(giftReservations.checklistItemId, id),
          eq(giftReservations.userId, userId),
        ));
      }
      return item;
    });
    if (!deleted) { res.status(404).json({ error: "Não encontramos esse item. Atualize a página e tente de novo." }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "checklist delete error");
    res.status(500).json({ error: "Não foi possível remover o item agora." });
  }
});

// ─── Milestones ───────────────────────────────────────────────────────────────

/** PATCH /api/me/milestones/:id — toggle milestone completion */
router.patch("/milestones/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Item inválido." }); return; }

  const parsed = toggleMilestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Confira os dados informados." });
    return;
  }
  try {
    const [updated] = await db
      .update(milestones)
      .set({
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? new Date() : null,
      })
      .where(and(eq(milestones.id, id), eq(milestones.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Não encontramos esse marco. Atualize a página e tente de novo." }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "milestones patch error");
    res.status(500).json({ error: "Não foi possível atualizar o marco agora." });
  }
});

// ─── Budget ───────────────────────────────────────────────────────────────────

/** PUT /api/me/budget — valor planejado de cada categoria (LC-R13) */
router.put("/budget", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  try {
    const owned = new Set((await listCategories(db, userId)).map((category) => category.id));
    if (parsed.data.categories.some((entry) => !owned.has(entry.categoryId))) {
      res.status(400).json({ error: "Escolha uma das categorias da lista." });
      return;
    }
    // Tudo numa transação: uma falha não deixa o orçamento pela metade.
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      for (const entry of parsed.data.categories) {
        await tx.update(checklistCategories)
          .set({ planned: String(entry.planned), updatedAt: now })
          .where(and(eq(checklistCategories.id, entry.categoryId), eq(checklistCategories.userId, userId)));
      }
      return listCategories(tx, userId);
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "budget put error");
    res.status(500).json({ error: "Não foi possível salvar o orçamento agora." });
  }
});

export default router;
