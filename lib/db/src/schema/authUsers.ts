import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Ninho-owned accounts. This table intentionally does not reference the
 * legacy profiles: new accounts get a new UUID userId and a fresh workspace.
 */
export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * One row per signed-in device. The session cookie carries the row id, so
 * signing out revokes exactly that device and "sign out everywhere" revokes
 * every row of the account. No IP or user agent is stored.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

/**
 * Attempt counters shared by every API process (autoscale). Keys are
 * "scope:hmac(value)", so no e-mail address or IP is stored in clear text.
 */
export const authAttempts = pgTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStartedAt: timestamp("window_started_at").notNull(),
  blockedUntil: timestamp("blocked_until"),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = typeof authUsers.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuthAttempt = typeof authAttempts.$inferSelect;
