import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ITEM_CATEGORIES } from "./checklistItems";

export const budgetCategories = pgTable("budget_categories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  planned: numeric("planned", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertBudgetSchema = z.object({
  categories: z
    .array(
      z.object({
        category: z.enum(ITEM_CATEGORIES, { error: "Escolha uma das categorias da lista." }),
        planned: z.number({ error: "Digite um valor em reais." })
          .min(0, "O valor planejado não pode ser negativo.")
          .max(9999999, "O valor planejado está alto demais."),
      }),
    )
    .max(ITEM_CATEGORIES.length, "São no máximo quatro categorias.")
    .refine(
      (categories) => new Set(categories.map((c) => c.category)).size === categories.length,
      "Cada categoria aparece uma vez só.",
    ),
}, { error: "Confira os dados informados." });

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>;
