import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  profiles,
  checklistItems,
  milestones,
  budgetCategories,
  updateProfileSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  upsertBudgetSchema,
  toggleMilestoneSchema,
} from "@workspace/db/schema";
import { requireAuth } from "../middlewares/requireAuth";
import { initializeUser, getOrCreateProfile } from "../lib/seed";

const router = Router();

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

    const [items, userMilestones, budget] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.userId, userId)).orderBy(checklistItems.sortOrder, checklistItems.createdAt),
      db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.week),
      db.select().from(budgetCategories).where(eq(budgetCategories.userId, userId)),
    ]);

    res.json({ profile, items, milestones: userMilestones, budget });
  } catch (err) {
    console.error("workspace error", err);
    res.status(500).json({ error: "Internal server error" });
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
    const [item] = await db
      .insert(checklistItems)
      .values({ ...parsed.data, price: String(parsed.data.price), userId })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    console.error("checklist post error", err);
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
    console.error("checklist patch error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/me/checklist/:id — remove a checklist item */
router.delete("/checklist/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [deleted] = await db
      .delete(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
      .returning();
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
