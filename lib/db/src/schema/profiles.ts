import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name"),
  dueDate: text("due_date"), // ISO date string "YYYY-MM-DD"
  city: text("city"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  dueDate: z.string().optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  onboardingComplete: z.boolean().optional(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
