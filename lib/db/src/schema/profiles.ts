import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name"),
  dueDate: text("due_date"), // ISO date string "YYYY-MM-DD"
  city: text("city"),
  babyName: text("baby_name"),
  hospital: text("hospital"),
  supportPerson: text("support_person"),
  personalNotes: text("personal_notes"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalName = z.string().trim().min(1).max(120).optional().nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data válida.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(`${value}T00:00:00Z`);
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  }, "Use uma data válida.");

export const updateProfileSchema = z.object({
  displayName: optionalName,
  dueDate: isoDate.optional().nullable(),
  city: optionalText(120),
  babyName: optionalName,
  hospital: optionalText(160),
  supportPerson: optionalText(120),
  personalNotes: optionalText(600),
  onboardingComplete: z.boolean().optional(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
