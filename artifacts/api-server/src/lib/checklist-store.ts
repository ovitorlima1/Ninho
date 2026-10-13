import { db } from "@workspace/db";
import {
  budgetCategories,
  checklistCategories,
  checklistItems,
  checklists,
  DEFAULT_CHECKLIST_NAME,
  profiles,
  type Checklist,
  type ChecklistCategory,
  type ChecklistItem,
  type ChecklistTemplate,
} from "@workspace/db/schema";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { normalizeName, planLegacyMigration } from "./checklist-rules";
import { CHECKLIST_TEMPLATE_DATA } from "./checklist-templates";
import { logger } from "./logger";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export function listChecklists(executor: Executor, userId: string): Promise<Checklist[]> {
  return executor.select().from(checklists).where(eq(checklists.userId, userId))
    .orderBy(asc(checklists.sortOrder), asc(checklists.id));
}

export function listCategories(executor: Executor, userId: string): Promise<ChecklistCategory[]> {
  return executor.select().from(checklistCategories).where(eq(checklistCategories.userId, userId))
    .orderBy(asc(checklistCategories.sortOrder), asc(checklistCategories.id));
}

/** A primeira lista da conta: é a que o link público mostra e a que recebe as inspirações. */
export async function primaryChecklist(executor: Executor, userId: string): Promise<Checklist | undefined> {
  const [list] = await executor.select().from(checklists).where(eq(checklists.userId, userId))
    .orderBy(asc(checklists.sortOrder), asc(checklists.id)).limit(1);
  return list;
}

/** Cria a lista com as categorias e os itens do modelo; os itens entram como sugestão (LC-R17). */
export async function createChecklistFromTemplate(
  tx: Tx,
  userId: string,
  template: ChecklistTemplate,
  name: string,
  sortOrder = 0,
): Promise<{ list: Checklist; categories: ChecklistCategory[]; items: ChecklistItem[] }> {
  const data = CHECKLIST_TEMPLATE_DATA[template];
  const [list] = await tx.insert(checklists).values({ userId, name, sortOrder }).returning();
  const categories = await tx.insert(checklistCategories).values(
    data.categories.map((category, index) => ({
      userId,
      listId: list!.id,
      name: category.name,
      icon: category.icon,
      tone: category.tone,
      planned: category.planned,
      sortOrder: index,
    })),
  ).returning();

  const byName = new Map(categories.map((category) => [category.name, category]));
  let order = 0;
  const rows = data.categories.flatMap((category) => category.items.map((item) => ({
    ...item,
    userId,
    listId: list!.id,
    categoryId: byName.get(category.name)!.id,
    category: category.name,
    status: "A comprar",
    suggested: true,
    sortOrder: ++order,
  })));
  const items = rows.length ? await tx.insert(checklistItems).values(rows).returning() : [];
  return { list: list!, categories, items };
}

/**
 * Leva uma conta de antes das listas para o modelo novo (LC-R26): cria "Enxoval do bebê", as
 * categorias com o valor planejado e liga cada item à sua. Devolve false se a conta já tem lista.
 * A trava por conta evita que duas abas (ou a varredura e um pedido) migrem ao mesmo tempo.
 */
export async function migrateLegacyUser(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`checklists:${userId}`}))`);
    if (await primaryChecklist(tx, userId)) return false;

    const [items, budget] = await Promise.all([
      tx.select().from(checklistItems).where(eq(checklistItems.userId, userId)),
      tx.select().from(budgetCategories).where(eq(budgetCategories.userId, userId)),
    ]);
    const plan = planLegacyMigration(items, budget);

    const [list] = await tx.insert(checklists).values({ userId, name: DEFAULT_CHECKLIST_NAME }).returning();
    const categories = await tx.insert(checklistCategories).values(
      plan.categories.map((category, index) => ({ ...category, userId, listId: list!.id, sortOrder: index })),
    ).returning();

    for (const legacyName of new Set(items.map((item) => item.category))) {
      const category = categories.find((candidate) => normalizeName(candidate.name) === normalizeName(legacyName))
        ?? categories[0]!;
      await tx.update(checklistItems)
        .set({ listId: list!.id, categoryId: category.id, category: category.name })
        .where(and(eq(checklistItems.userId, userId), eq(checklistItems.category, legacyName), isNull(checklistItems.listId)));
    }
    if (plan.suggestedItemIds.length) {
      await tx.update(checklistItems).set({ suggested: true })
        .where(and(eq(checklistItems.userId, userId), inArray(checklistItems.id, plan.suggestedItemIds)));
    }
    // O planejado agora mora na categoria.
    await tx.delete(budgetCategories).where(eq(budgetCategories.userId, userId));
    return true;
  });
}

/**
 * Roda ao subir a API: migra toda conta que ainda não tem lista, para que o link público e a
 * exportação já encontrem os dados no lugar antes de a dona da conta entrar.
 */
export async function backfillLegacyChecklists(): Promise<number> {
  const pending = await db.select({ userId: profiles.userId }).from(profiles)
    .where(sql`NOT EXISTS (SELECT 1 FROM ${checklists} WHERE ${checklists.userId} = ${profiles.userId})`);
  let migrated = 0;
  for (const { userId } of pending) {
    try {
      if (await migrateLegacyUser(userId)) migrated += 1;
    } catch (err) {
      // Uma conta com problema não segura as outras; ela é migrada de novo no próximo acesso.
      logger.error({ err }, "legacy checklist migration error");
    }
  }
  return migrated;
}
