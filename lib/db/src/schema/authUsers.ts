import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Ninho-owned accounts. This table intentionally does not reference the
 * legacy profiles: new accounts get a new UUID userId and a fresh workspace.
 */
export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = typeof authUsers.$inferInsert;