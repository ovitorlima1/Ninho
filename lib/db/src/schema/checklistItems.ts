import { boolean, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ITEM_STATUSES = ["A comprar", "Comprado", "Ganhei"] as const;
export const ITEM_CATEGORIES = ["Roupas", "Higiene", "Alimentação", "Acessórios"] as const;
export const RECOMMENDATION_IDS = [
  "body-manga-curta",
  "cueiro-muslin",
  "kit-higiene",
  "toalha-capuz",
  "mamadeira-anticolica",
  "babador-bandana",
  "bolsa-maternidade",
  "organizador-fraldas",
] as const;
export const RECOMMENDATION_CATEGORY_BY_ID = {
  "body-manga-curta": "Roupas",
  "cueiro-muslin": "Roupas",
  "kit-higiene": "Higiene",
  "toalha-capuz": "Higiene",
  "mamadeira-anticolica": "Alimentação",
  "babador-bandana": "Alimentação",
  "bolsa-maternidade": "Acessórios",
  "organizador-fraldas": "Acessórios",
} as const satisfies Record<(typeof RECOMMENDATION_IDS)[number], (typeof ITEM_CATEGORIES)[number]>;

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  group: text("group").notNull().default(""),
  qty: integer("qty").notNull().default(1),
  status: text("status").notNull().default("A comprar"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  essential: boolean("essential").notNull().default(false),
  recommendationId: text("recommendation_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userRecommendationUnique: uniqueIndex("checklist_items_user_recommendation_unique")
    .on(table.userId, table.recommendationId),
}));

export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateChecklistItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
  group: z.string().max(100).optional(),
  qty: z.number().int().min(1).max(999).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  price: z.number().min(0).max(99999).optional(),
  essential: z.boolean().optional(),
  recommendationId: z.enum(RECOMMENDATION_IDS).nullable().optional(),
});

export const createChecklistItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(ITEM_CATEGORIES).default("Roupas"),
  group: z.string().max(100).default("Adicionado por você"),
  qty: z.number().int().min(1).max(999).default(1),
  status: z.enum(ITEM_STATUSES).default("A comprar"),
  price: z.number().min(0).max(99999).default(0),
  essential: z.boolean().default(false),
  recommendationId: z.enum(RECOMMENDATION_IDS).nullable().optional(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type UpdateChecklistItem = z.infer<typeof updateChecklistItemSchema>;
export type CreateChecklistItem = z.infer<typeof createChecklistItemSchema>;
