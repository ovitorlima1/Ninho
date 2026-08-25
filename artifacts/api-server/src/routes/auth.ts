import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { authUsers, passwordResetTokens } from "@workspace/db/schema";
import {
  createSessionToken,
  expiredSessionCookie,
  hashPassword,
  SESSION_COOKIE,
  sessionCookie,
  verifyPassword,
  parseCookieHeader,
  verifySessionToken,
  createPasswordResetToken,
  hashPasswordResetToken,
} from "../lib/auth";
import { sendPasswordResetEmail } from "../lib/email";

const router = Router();

type Credentials = { email: string; password: string };
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RESPONSE_MIN_MS = 400;
const GENERIC_RESET_MESSAGE = "Se houver uma conta com este e-mail, enviaremos um link para redefinir sua senha.";

function validateCredentials(body: unknown): { data: Credentials } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Confira os dados informados." };
  const values = body as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return { error: "Digite um e-mail válido." };
  }
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password.length > 128) return { error: "A senha deve ter no máximo 128 caracteres." };
  return { data: { email, password } };
}

function publicUser(user: typeof authUsers.$inferSelect) {
  return { id: user.id, email: user.email };
}

function getPublicAppUrl(): string {
  const configured = process.env.PUBLIC_APP_URL;
  const developmentDomain = process.env.NODE_ENV === "production" ? undefined : process.env.REPLIT_DEV_DOMAIN;
  const rawUrl = configured || (developmentDomain ? `https://${developmentDomain}` : undefined);
  if (!rawUrl) {
    throw new Error("PUBLIC_APP_URL must be set to the canonical HTTPS application URL.");
  }

  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use HTTPS.");
  }
  return url.origin;
}

async function waitForMinimumResponseTime(startedAt: number): Promise<void> {
  const remaining = PASSWORD_RESET_RESPONSE_MIN_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/** POST /api/auth/register — creates a new Ninho account and its session. */
router.post("/register", async (req, res) => {
  const validated = validateCredentials(req.body);
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;

  try {
    const [existing] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, data.email));
    if (existing) {
      res.status(400).json({ error: "Não foi possível criar a conta. Confira os dados e tente novamente." });
      return;
    }

    const [user] = await db.insert(authUsers).values({
      id: randomUUID(),
      email: data.email,
      passwordHash: await hashPassword(data.password),
    }).returning();
    if (!user) {
      res.status(500).json({ error: "Não foi possível criar sua conta agora." });
      return;
    }

    res.append("Set-Cookie", sessionCookie(createSessionToken(user.id, user.sessionVersion)));
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "registration error");
    res.status(500).json({ error: "Não foi possível criar sua conta agora." });
  }
});

/** POST /api/auth/login — authenticates with a generic failure message. */
router.post("/login", async (req, res) => {
  const validated = validateCredentials(req.body);
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, data.email));
    const valid = user ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!valid || !user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    res.append("Set-Cookie", sessionCookie(createSessionToken(user.id, user.sessionVersion)));
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Não foi possível entrar agora." });
  }
});

/** GET /api/auth/session — returns null instead of throwing for visitors. */
router.get("/session", async (req, res) => {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const claims = token ? verifySessionToken(token) : null;
  if (!claims) {
    res.json({ user: null });
    return;
  }

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, claims.userId));
    if (!user || user.sessionVersion !== claims.sessionVersion) {
      res.append("Set-Cookie", expiredSessionCookie());
      res.json({ user: null });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "session lookup error");
    res.status(500).json({ error: "Não foi possível verificar sua sessão." });
  }
});

/** POST /api/auth/password-reset/request — always returns the same response. */
router.post("/password-reset/request", async (req, res) => {
  const startedAt = Date.now();
  const rawEmail = req.body && typeof req.body === "object" && "email" in req.body
    ? (req.body as Record<string, unknown>).email
    : "";
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    res.status(400).json({ error: "Digite um e-mail válido." });
    return;
  }

  try {
    const publicAppUrl = getPublicAppUrl();
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email));
    // Generate a token for every syntactically valid request so the common path
    // is not distinguishable by cryptographic work alone.
    const { token, tokenHash } = createPasswordResetToken();
    if (user) {
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await db.insert(passwordResetTokens).values({
        id: randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${publicAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
      void sendPasswordResetEmail(user.email, resetUrl).catch((err: unknown) => {
        req.log.error({ err }, "password reset email delivery error");
      });
    }
  } catch (err) {
    // Do not turn database or delivery details into an account-enumeration signal.
    req.log.error({ err }, "password reset request error");
  }

  await waitForMinimumResponseTime(startedAt);
  res.status(202).json({ message: GENERIC_RESET_MESSAGE });
});

/** POST /api/auth/password-reset/complete — consumes one reset token. */
router.post("/password-reset/complete", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (token.length < 40 || token.length > 128) {
    res.status(400).json({ error: "Este link de recuperação é inválido ou expirou." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres." });
    return;
  }
  if (password.length > 128) {
    res.status(400).json({ error: "A senha deve ter no máximo 128 caracteres." });
    return;
  }

  try {
    const now = new Date();
    const tokenHash = hashPasswordResetToken(token);
    const result = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ))
        .returning({ userId: passwordResetTokens.userId });
      if (!claimed) return false;

      const [user] = await tx
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.id, claimed.userId));
      if (!user) return false;

      await tx
        .update(authUsers)
        .set({
          passwordHash: await hashPassword(password),
          sessionVersion: sql`${authUsers.sessionVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(authUsers.id, user.id));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
      return true;
    });

    if (!result) {
      res.status(400).json({ error: "Este link de recuperação é inválido ou expirou." });
      return;
    }
    res.append("Set-Cookie", expiredSessionCookie());
    res.json({ message: "Sua senha foi redefinida. Entre novamente com a nova senha." });
  } catch (err) {
    req.log.error({ err }, "password reset completion error");
    res.status(500).json({ error: "Não foi possível redefinir sua senha agora." });
  }
});

/** POST /api/auth/logout — clears the browser session cookie. */
router.post("/logout", (_req, res) => {
  res.append("Set-Cookie", expiredSessionCookie());
  res.status(204).send();
});

export default router;