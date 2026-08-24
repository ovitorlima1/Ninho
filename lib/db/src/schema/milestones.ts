import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  week: integer("week").notNull(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
});

export const toggleMilestoneSchema = z.object({
  completed: z.boolean(),
});

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
