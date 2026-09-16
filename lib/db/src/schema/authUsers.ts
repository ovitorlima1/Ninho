import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

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

// ─── Validação das rotas de acesso ───────────────────────────────────────────

const INVALID_BODY = "Confira os dados informados.";
const INVALID_EMAIL = "Digite um e-mail válido.";
const INVALID_RESET_LINK = "Este link de recuperação é inválido ou expirou.";

const emailField = z
  .string({ error: INVALID_EMAIL })
  .trim()
  .toLowerCase()
  .max(320, INVALID_EMAIL)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, INVALID_EMAIL);

const newPasswordField = z
  .string({ error: "A senha precisa ter pelo menos 8 caracteres." })
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

/**
 * No login a senha só precisa existir: recusar ali uma senha curta com a regra
 * do cadastro vazaria a regra e confundiria contas antigas.
 */
const currentPasswordField = z
  .string({ error: "Digite sua senha." })
  .min(1, "Digite sua senha.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

export const registerSchema = z.object({ email: emailField, password: newPasswordField }, { error: INVALID_BODY });
export const loginSchema = z.object({ email: emailField, password: currentPasswordField }, { error: INVALID_BODY });
export const passwordResetRequestSchema = z.object({ email: emailField }, { error: INVALID_EMAIL });
export const passwordResetCompleteSchema = z.object({
  token: z.string({ error: INVALID_RESET_LINK }).min(40, INVALID_RESET_LINK).max(128, INVALID_RESET_LINK),
  password: newPasswordField,
}, { error: INVALID_BODY });

export const DELETE_ACCOUNT_CONFIRMATION = "EXCLUIR";
export const deleteAccountSchema = z.object({
  password: currentPasswordField,
  confirmation: z.literal(DELETE_ACCOUNT_CONFIRMATION, { error: "Digite EXCLUIR para confirmar." }),
}, { error: INVALID_BODY });
