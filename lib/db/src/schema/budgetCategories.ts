import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  categories: z.array(
    z.object({
      category: z.string().min(1).max(100),
      planned: z.number().min(0).max(9999999),
    }),
  ),
});

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>;
