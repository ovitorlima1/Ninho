import { db } from "@workspace/db";
import { DEFAULT_CHECKLIST_NAME, milestones, profiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createChecklistFromTemplate } from "./checklist-store";

const DEFAULT_MILESTONES = [
  { week: 20, title: "Defina o estilo do quarto",    note: "feito com calma" },
  { week: 28, title: "Feche a lista de roupas RN",   note: "seu momento" },
  { week: 32, title: "Organize o chá de bebê",       note: "a seguir" },
  { week: 36, title: "Mala da maternidade pronta",   note: "mais à frente" },
] as const;

/**
 * Atomically creates a user profile and seeds the default list (categories with
 * their planned budget, items marked as suggestions) and milestones in a single
 * transaction. Uses INSERT ... ON CONFLICT DO NOTHING so concurrent first-login
 * requests are safe: only the request whose INSERT
 * wins the uniqueness race creates data; the other gets isNew=false.
 *
 * Seeding is tied to profile creation, NOT to checklist emptiness, so a user
 * who deletes all their items will NOT have defaults re-inserted on next load.
 */
export async function initializeUser(userId: string): Promise<{
  profile: typeof profiles.$inferSelect;
  isNew: boolean;
}> {
  return db.transaction(async (tx) => {
    // Atomic insert-if-absent. Only one concurrent request wins.
    const [inserted] = await tx
      .insert(profiles)
      .values({ userId })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Profile already exists — fetch it and return (no seeding).
      const [existing] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      return { profile: existing!, isNew: false };
    }

    // New user: seed all default data inside the same transaction so the
    // data is visible atomically once the transaction commits. A transaction
    // is a single connection, so the inserts run one after the other.
    await createChecklistFromTemplate(tx, userId, "enxoval", DEFAULT_CHECKLIST_NAME);
    await tx.insert(milestones).values(
      DEFAULT_MILESTONES.map((m) => ({ ...m, userId, completed: false })),
    );

    return { profile: inserted, isNew: true };
  });
}

/**
 * Returns the user's profile, initializing the workspace only when it does not
 * exist yet. New accounts are seeded at registration, so the common path is a
 * single SELECT — reads no longer write (the old INSERT ... ON CONFLICT ran on
 * every workspace load and burned a sequence value each time).
 *
 * Accounts created before seeding moved to registration are initialized here
 * on first use, with the same atomic guarantees as initializeUser.
 */
export async function ensureUserInitialized(
  userId: string,
): Promise<typeof profiles.$inferSelect> {
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  if (existing) return existing;

  const { profile } = await initializeUser(userId);
  return profile;
}
