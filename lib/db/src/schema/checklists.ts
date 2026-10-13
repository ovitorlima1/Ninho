import { boolean, index, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

/**
 * Listas do Enxoval (Enxoval do bebê, Mala da maternidade…) e as categorias de
 * cada uma. Os itens continuam em `checklist_items`, agora com `list_id` e
 * `category_id`. O valor planejado do Orçamento mora na categoria.
 */
export const CHECKLIST_TEMPLATES = ["enxoval", "mala-maternidade", "quarto-do-bebe", "em-branco"] as const;
export const CATEGORY_ICONS = ["heart", "clipboard", "utensils", "sparkles", "shirt", "bath", "bed", "briefcase"] as const;
export const CATEGORY_TONES = ["lilac", "mint", "peach", "butter"] as const;

export const MAX_CHECKLISTS = 10;
export const MAX_CHECKLIST_CATEGORIES = 12;
export const DEFAULT_CHECKLIST_NAME = "Enxoval do bebê";

export const checklists = pgTable(
  "checklists",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    /** A mãe fechou o aviso "começamos com sugestões" desta lista. */
    suggestionsNoticeDismissed: boolean("suggestions_notice_dismissed").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("checklists_user_id_idx").on(table.userId)],
);

export const checklistCategories = pgTable(
  "checklist_categories",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    listId: integer("list_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("heart"),
    tone: text("tone").notNull().default("lilac"),
    /** Valor planejado no Orçamento, em reais. */
    planned: numeric("planned", { precision: 10, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("checklist_categories_list_id_idx").on(table.listId)],
);

const listName = z.string({ error: "Dê um nome para a lista." }).trim()
  .min(1, "Dê um nome para a lista.")
  .max(60, "O nome da lista tem no máximo 60 caracteres.");
const categoryName = z.string({ error: "Dê um nome para a categoria." }).trim()
  .min(1, "Dê um nome para a categoria.")
  .max(30, "O nome da categoria tem no máximo 30 caracteres.");
const categoryIcon = z.enum(CATEGORY_ICONS, { error: "Escolha um dos ícones da lista." });

export const createChecklistSchema = z.object({
  template: z.enum(CHECKLIST_TEMPLATES, { error: "Escolha um dos modelos." }),
  name: listName,
}, { error: "Confira os dados informados." });

export const updateChecklistSchema = z.object({
  name: listName.optional(),
  // Só dá para fechar: o aviso não volta.
  suggestionsNoticeDismissed: z.literal(true).optional(),
}, { error: "Confira os dados informados." });

export const createChecklistCategorySchema = z.object({
  name: categoryName,
  icon: categoryIcon.default("heart"),
}, { error: "Confira os dados informados." });

export const updateChecklistCategorySchema = z.object({
  name: categoryName.optional(),
  icon: categoryIcon.optional(),
}, { error: "Confira os dados informados." });

export const updateBudgetSchema = z.object({
  categories: z
    .array(
      z.object({
        categoryId: z.number({ error: "Escolha uma das categorias da lista." }).int().positive(),
        planned: z.number({ error: "Digite um valor em reais." })
          .min(0, "O valor planejado não pode ser negativo.")
          .max(9999999, "O valor planejado está alto demais."),
      }),
      { error: "Confira os dados informados." },
    )
    .max(MAX_CHECKLISTS * MAX_CHECKLIST_CATEGORIES, "São categorias demais para um orçamento só.")
    .refine(
      (categories) => new Set(categories.map((c) => c.categoryId)).size === categories.length,
      "Cada categoria aparece uma vez só.",
    ),
}, { error: "Confira os dados informados." });

export type Checklist = typeof checklists.$inferSelect;
export type ChecklistCategory = typeof checklistCategories.$inferSelect;
export type ChecklistTemplate = (typeof CHECKLIST_TEMPLATES)[number];
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
export type CategoryTone = (typeof CATEGORY_TONES)[number];
export type CreateChecklist = z.infer<typeof createChecklistSchema>;
export type UpdateChecklist = z.infer<typeof updateChecklistSchema>;
export type CreateChecklistCategory = z.infer<typeof createChecklistCategorySchema>;
export type UpdateChecklistCategory = z.infer<typeof updateChecklistCategorySchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;
