import { randomBytes } from "node:crypto";
import { Router } from "express";
import { eq, and, desc, isNull, ne, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  profiles,
  checklistItems,
  milestones,
  budgetCategories,
  updateProfileSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  RECOMMENDATION_CATEGORY_BY_ID,
  upsertBudgetSchema,
  toggleMilestoneSchema,
  giftReservations,
  giftShareLinks,
  updateGiftReservationSchema,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/requireAuth";
import { initializeUser, getOrCreateProfile } from "../lib/seed";

const router = Router();

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

// All /me routes require auth
router.use(requireAuth);

// ─── Workspace ────────────────────────────────────────────────────────────────

/** GET /api/me/workspace — full user workspace (profile + items + milestones + budget) */
router.get("/workspace", async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    // initializeUser atomically creates the profile and seeds default data
    // for first-time users inside a single transaction. On subsequent calls
    // it is a no-op (isNew=false) and never re-seeds, so an intentionally
    // empty checklist stays empty.
    const { profile } = await initializeUser(userId);

    const [items, userMilestones, budget, reservations] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.userId, userId)).orderBy(checklistItems.sortOrder, checklistItems.createdAt),
      db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.week),
      db.select().from(budgetCategories).where(eq(budgetCategories.userId, userId)),
      db.select().from(giftReservations).where(eq(giftReservations.userId, userId)),
    ]);

    res.json({ profile, items, milestones: userMilestones, budget, giftReservations: reservations });
  } catch (err) {
    console.error("workspace error", err);
    res.status(500).json({ error: "Internal server error" });
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
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
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
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
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
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    await getOrCreateProfile(userId);
    const [updated] = await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error("profile update error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Checklist ────────────────────────────────────────────────────────────────

/** POST /api/me/checklist — add a new checklist item */
router.post("/checklist", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = createChecklistItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    if (parsed.data.recommendationId) {
      const [existing] = await db
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(and(
          eq(checklistItems.userId, userId),
          eq(checklistItems.recommendationId, parsed.data.recommendationId),
        ))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "Esta recomendação já está na sua lista." });
        return;
      }
    }
    const data = parsed.data.recommendationId
      ? {
          ...parsed.data,
          category: RECOMMENDATION_CATEGORY_BY_ID[parsed.data.recommendationId],
        }
      : parsed.data;
    const [item] = await db
      .insert(checklistItems)
      .values({ ...data, price: String(data.price), userId })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Esta recomendação já está na sua lista." });
      return;
    }
    req.log.error({ err }, "Checklist post error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/me/checklist/:id — update a checklist item */
router.patch("/checklist/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = updateChecklistItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    const [currentItem] = await db
      .select({ id: checklistItems.id, category: checklistItems.category })
      .from(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
      .limit(1);
    if (!currentItem) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    if (parsed.data.recommendationId) {
      if (currentItem.category !== RECOMMENDATION_CATEGORY_BY_ID[parsed.data.recommendationId]) {
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
    const [updated] = await db
      .update(checklistItems)
      .set(update)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Item not found" }); return; }
    res.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Esta recomendação já está vinculada a outro item." });
      return;
    }
    req.log.error({ err }, "Checklist patch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/me/checklist/:id — remove a checklist item */
router.delete("/checklist/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

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
    if (!deleted) { res.status(404).json({ error: "Item not found" }); return; }
    res.status(204).send();
  } catch (err) {
    console.error("checklist delete error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Milestones ───────────────────────────────────────────────────────────────

/** PATCH /api/me/milestones/:id — toggle milestone completion */
router.patch("/milestones/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = toggleMilestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
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
    if (!updated) { res.status(404).json({ error: "Milestone not found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error("milestones patch error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Budget ───────────────────────────────────────────────────────────────────

/** PUT /api/me/budget — upsert all budget categories */
router.put("/budget", async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = upsertBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  try {
    // Delete and re-insert inside a transaction so a failure cannot leave
    // the user with a partial (or empty) budget.
    const result = await db.transaction(async (tx) => {
      await tx.delete(budgetCategories).where(eq(budgetCategories.userId, userId));
      if (parsed.data.categories.length > 0) {
        await tx.insert(budgetCategories).values(
          parsed.data.categories.map((c: { category: string; planned: number }) => ({
            userId,
            category: c.category,
            planned: String(c.planned),
          })),
        );
      }
      return tx.select().from(budgetCategories).where(eq(budgetCategories.userId, userId));
    });
    res.json(result);
  } catch (err) {
    console.error("budget put error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
