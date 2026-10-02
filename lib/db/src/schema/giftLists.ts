import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

/**
 * Listas de presentes (chá de fralda, chá de bebê…). São dados separados do
 * enxoval: o link do Perfil continua compartilhando `checklist_items`.
 * Dinheiro sempre em centavos, como inteiro.
 */
export const GIFT_LIST_TEMPLATES = ["cha-de-fralda", "cha-de-bebe", "em-branco"] as const;
export const GIFT_ITEM_KINDS = ["money", "units", "single"] as const;
export const GIFT_PLEDGE_KINDS = ["money", "units", "whole"] as const;
export const GIFT_PLEDGE_STATUSES = ["promised", "confirmed", "cancelled"] as const;
export const GIFT_WHOLE_MODES = ["bring", "pix"] as const;
export const PIX_KEY_TYPES = ["cpf", "cnpj", "phone", "email", "random"] as const;

export const MAX_GIFT_LISTS = 10;
export const MAX_GIFT_LIST_ITEMS = 100;
export const MIN_PLEDGE_CENTS = 100;
export const MAX_GOAL_CENTS = 9_999_900;

export const giftLists = pgTable(
  "gift_lists",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    template: text("template").notNull().default("em-branco"),
    eventDate: text("event_date"),
    eventTime: text("event_time"),
    eventPlace: text("event_place"),
    message: text("message"),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("gift_lists_user_id_idx").on(table.userId)],
);

export const giftListItems = pgTable(
  "gift_list_items",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id").notNull(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("single"),
    goalCents: integer("goal_cents"),
    goalUnits: integer("goal_units"),
    unitLabel: text("unit_label").notNull().default("unidades"),
    /** Preço de referência de um item de uma pessoa: só informa, não entra em conta. */
    referenceCents: integer("reference_cents"),
    note: text("note"),
    similarOk: boolean("similar_ok").notNull().default(false),
    storeUrl: text("store_url"),
    allowWhole: boolean("allow_whole").notNull().default(true),
    /** "Já tenho": sai da lista do convidado sem apagar o histórico. */
    hidden: boolean("hidden").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("gift_list_items_list_id_idx").on(table.listId)],
);

/**
 * O que um convidado prometeu: um valor, algumas unidades ou o item inteiro.
 * `code` é o identificador que vai no Pix e aparece no extrato da mãe;
 * `manageTokenHash` guarda só o hash do link particular de quem prometeu.
 */
export const giftPledges = pgTable(
  "gift_pledges",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id").notNull(),
    itemId: integer("item_id").notNull(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents"),
    units: integer("units"),
    wholeMode: text("whole_mode"),
    guestName: text("guest_name"),
    showName: boolean("show_name").notNull().default(false),
    guestSaysPaid: boolean("guest_says_paid").notNull().default(false),
    status: text("status").notNull().default("promised"),
    code: text("code").notNull().unique(),
    manageTokenHash: text("manage_token_hash").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (table) => [
    index("gift_pledges_item_id_idx").on(table.itemId),
    index("gift_pledges_list_id_idx").on(table.listId),
  ],
);

/** Chave Pix da mãe: só sai do servidor dentro do código de uma contribuição. */
export const pixAccounts = pgTable("pix_accounts", {
  userId: text("user_id").primaryKey(),
  key: text("key").notNull(),
  keyType: text("key_type").notNull(),
  recipientName: text("recipient_name").notNull(),
  city: text("city").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GiftList = typeof giftLists.$inferSelect;
export type GiftListItem = typeof giftListItems.$inferSelect;
export type GiftPledge = typeof giftPledges.$inferSelect;
export type PixAccount = typeof pixAccounts.$inferSelect;
export type GiftItemKind = (typeof GIFT_ITEM_KINDS)[number];
export type GiftPledgeKind = (typeof GIFT_PLEDGE_KINDS)[number];
export type GiftPledgeStatus = (typeof GIFT_PLEDGE_STATUSES)[number];

// ─── Validação ───────────────────────────────────────────────────────────────

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((value) => (value ? value : value === undefined ? undefined : null));

const eventDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable().optional();
const eventTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.").nullable().optional();

/** Só https, com domínio de verdade: o convidado vê o domínio antes de abrir. */
const storeUrl = z
  .string()
  .trim()
  .max(2000, "O link é longo demais.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use um link que comece com https://")
  .nullable()
  .optional();

export const createGiftListSchema = z.object({
  template: z.enum(GIFT_LIST_TEMPLATES),
  name: z.string().trim().min(1).max(80).optional(),
});

export const updateGiftListSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a lista.").max(80).optional(),
  eventDate,
  eventTime,
  eventPlace: optionalText(200),
  message: optionalText(280),
});

const goalCents = z.number().int().min(MIN_PLEDGE_CENTS, "O valor mínimo é R$ 1,00.").max(MAX_GOAL_CENTS, "O valor máximo é R$ 99.999,00.");
const goalUnits = z.number().int().min(1, "A quantidade mínima é 1.").max(999, "A quantidade máxima é 999.");

const giftItemFields = {
  name: z.string().trim().min(1, "Dê um nome para o presente.").max(120),
  kind: z.enum(GIFT_ITEM_KINDS),
  goalCents: goalCents.nullable().optional(),
  goalUnits: goalUnits.nullable().optional(),
  unitLabel: z.string().trim().min(1).max(20).optional(),
  referenceCents: z.number().int().min(0).max(MAX_GOAL_CENTS).nullable().optional(),
  note: optionalText(200),
  similarOk: z.boolean().optional(),
  storeUrl,
  allowWhole: z.boolean().optional(),
  hidden: z.boolean().optional(),
};

export const createGiftItemSchema = z.object(giftItemFields).superRefine((item, ctx) => {
  if (item.kind === "money" && !item.goalCents) ctx.addIssue({ code: "custom", path: ["goalCents"], message: "Informe o valor total do presente." });
  if (item.kind === "units" && !item.goalUnits) ctx.addIssue({ code: "custom", path: ["goalUnits"], message: "Informe a quantidade." });
});

export const updateGiftItemSchema = z.object({ ...giftItemFields, name: giftItemFields.name.optional(), kind: giftItemFields.kind.optional() });

export const reorderGiftItemsSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(MAX_GIFT_LIST_ITEMS) });

export const updatePledgeStatusSchema = z.object({ status: z.enum(GIFT_PLEDGE_STATUSES) });

export const upsertPixAccountSchema = z.object({
  key: z.string().trim().min(1, "Informe a chave Pix.").max(120),
  recipientName: z.string().trim().min(2, "Informe o nome de quem recebe.").max(25, "O nome pode ter até 25 caracteres."),
  city: z.string().trim().min(2, "Informe a cidade.").max(15, "A cidade pode ter até 15 caracteres."),
});

const manageToken = z.string().min(40).max(128);

export const createPledgeSchema = z.object({
  itemId: z.number().int().positive(),
  kind: z.enum(GIFT_PLEDGE_KINDS),
  amountCents: z.number().int().positive().optional(),
  units: z.number().int().positive().optional(),
  wholeMode: z.enum(GIFT_WHOLE_MODES).optional(),
  guestName: z.string().trim().max(120).nullable().optional(),
  showName: z.boolean().optional(),
});
export const lookupPledgesSchema = z.object({ tokens: z.array(manageToken).max(20) });
export const minePledgeSchema = z.object({ manageToken, guestSaysPaid: z.boolean() });
export const cancelPledgeSchema = z.object({ manageToken });
