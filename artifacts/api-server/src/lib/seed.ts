import { db } from "@workspace/db";
import {
  budgetCategories,
  checklistItems,
  milestones,
  profiles,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ITEMS = [
  { name: "Body manga curta",       category: "Roupas",      group: "RN · essenciais",  qty: 6, status: "A comprar", price: "38",  essential: true,  sortOrder: 1 },
  { name: "Macacão de algodão",     category: "Roupas",      group: "0–3 meses",         qty: 5, status: "A comprar", price: "74",  essential: true,  sortOrder: 2 },
  { name: "Cueiro leve",            category: "Roupas",      group: "Primeiros dias",    qty: 3, status: "A comprar", price: "42",  essential: false, sortOrder: 3 },
  { name: "Toalha com capuz",       category: "Higiene",     group: "Banho",             qty: 2, status: "A comprar", price: "58",  essential: true,  sortOrder: 4 },
  { name: "Fralda de pano",         category: "Higiene",     group: "Troca",             qty: 8, status: "A comprar", price: "12",  essential: true,  sortOrder: 5 },
  { name: "Kit primeiros cuidados", category: "Higiene",     group: "Farmacinha",        qty: 1, status: "A comprar", price: "96",  essential: false, sortOrder: 6 },
  { name: "Mamadeira anticólica",   category: "Alimentação", group: "Apoio",             qty: 2, status: "A comprar", price: "64",  essential: false, sortOrder: 7 },
  { name: "Babador de tecido",      category: "Alimentação", group: "Dia a dia",         qty: 5, status: "A comprar", price: "16",  essential: false, sortOrder: 8 },
  { name: "Trocador portátil",      category: "Acessórios",  group: "Passeio",           qty: 1, status: "A comprar", price: "88",  essential: false, sortOrder: 9 },
  { name: "Bolsa da maternidade",   category: "Acessórios",  group: "Maternidade",       qty: 1, status: "A comprar", price: "310", essential: true,  sortOrder: 10 },
] as const;

const DEFAULT_MILESTONES = [
  { week: 20, title: "Defina o estilo do quarto",    note: "feito com calma" },
  { week: 28, title: "Feche a lista de roupas RN",   note: "seu momento" },
  { week: 32, title: "Organize o chá de bebê",       note: "a seguir" },
  { week: 36, title: "Mala da maternidade pronta",   note: "mais à frente" },
] as const;

const DEFAULT_BUDGET = [
  { category: "Roupas",      planned: "1240" },
  { category: "Higiene",     planned: "680"  },
  { category: "Alimentação", planned: "520"  },
  { category: "Acessórios",  planned: "940"  },
] as const;

/**
 * Atomically creates a user profile and seeds default checklist, milestones,
 * and budget in a single transaction. Uses INSERT ... ON CONFLICT DO NOTHING
 * so concurrent first-login requests are safe: only the request whose INSERT
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
    // data is visible atomically once the transaction commits.
    await Promise.all([
      tx.insert(checklistItems).values(
        DEFAULT_ITEMS.map((item) => ({ ...item, userId })),
      ),
      tx.insert(milestones).values(
        DEFAULT_MILESTONES.map((m) => ({ ...m, userId, completed: false })),
      ),
      tx.insert(budgetCategories).values(
        DEFAULT_BUDGET.map((b) => ({ ...b, userId })),
      ),
    ]);

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
