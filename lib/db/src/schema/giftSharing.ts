import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";
import { z } from "zod/v4";

export const GIFT_RESERVATION_STATUSES = ["vou presentear", "presenteado"] as const;

export const giftShareLinks = pgTable(
  "gift_share_links",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull().unique(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    activeUserUnique: uniqueIndex("gift_share_links_active_user_unique")
      .on(table.userId)
      .where(isNull(table.revokedAt)),
  }),
);

export const giftReservations = pgTable(
  "gift_reservations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    checklistItemId: integer("checklist_item_id").notNull(),
    shareLinkId: integer("share_link_id").notNull(),
    guestName: text("guest_name"),
    status: text("status").notNull().default("vou presentear"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    checklistItemUnique: uniqueIndex("gift_reservations_checklist_item_unique").on(table.checklistItemId),
  }),
);

export const reserveGiftSchema = z.object({
  itemId: z.number().int().positive(),
  guestName: z.string().trim().max(120).optional().nullable(),
  status: z.enum(GIFT_RESERVATION_STATUSES).default("vou presentear"),
});

export const updateGiftReservationSchema = z.object({
  guestName: z.string().trim().max(120).optional().nullable(),
  status: z.enum(GIFT_RESERVATION_STATUSES).optional(),
});

export type GiftShareLink = typeof giftShareLinks.$inferSelect;
export type GiftReservation = typeof giftReservations.$inferSelect;
export type ReserveGift = z.infer<typeof reserveGiftSchema>;
export type UpdateGiftReservation = z.infer<typeof updateGiftReservationSchema>;