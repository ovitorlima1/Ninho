import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { authUsers, passwordResetTokens } from "@workspace/db/schema";
import {
  expiredSessionCookie,
  hashPassword,
  sessionCookie,
  verifyPassword,
  createPasswordResetToken,
  hashPasswordResetToken,
  authAttemptLimiter,
  passwordResetEmailLimiter,
  passwordResetOriginLimiter,
} from "../lib/auth";
import { sendPasswordResetEmail } from "../lib/email";
import { initializeUser } from "../lib/seed";
import { createSession, resolveSession, revokeAllSessions, revokeCurrentSession } from "../lib/sessions";

const router = Router();

type Credentials = { email: string; password: string };
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RESPONSE_MIN_MS = 400;
const GENERIC_RESET_MESSAGE = "Se houver uma conta com este e-mail, enviaremos um link para redefinir sua senha.";
const AUTH_RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
const PASSWORD_RESET_RATE_LIMIT_MESSAGE = "Muitos pedidos de redefinição de senha. Aguarde uma hora antes de tentar novamente.";

/**
 * No cadastro a senha precisa ter 8+ caracteres. No login não: recusar ali uma
 * senha curta com essa mensagem vazaria a regra e confundiria contas antigas —
 * o login responde sempre com a mensagem genérica de credenciais inválidas.
 */
function validateCredentials(body: unknown, mode: "register" | "login"): { data: Credentials } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Confira os dados informados." };
  const values = body as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return { error: "Digite um e-mail válido." };
  }
  if (mode === "login" && password.length === 0) return { error: "Digite sua senha." };
  if (mode === "register" && password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password.length > 128) return { error: "A senha deve ter no máximo 128 caracteres." };
  return { data: { email, password } };
}

function publicUser(user: typeof authUsers.$inferSelect) {
  return { id: user.id, email: user.email };
}

function getRequestOrigin(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getAuthAttemptKeys(scope: "login" | "register", email: string, origin: string): string[] {
  return [`auth:${scope}:origin:${origin}`, `auth:${scope}:account:${email}`];
}

/**
 * Password reset counters live in their own limiters, so the e-mail and the
 * origin quotas can differ. Each limiter receives a single key.
 */
function getPasswordResetAttemptKeys(scope: "origin" | "account", value: string): string[] {
  return [`auth:password-reset:${scope}:${value}`];
}

type RateLimitedRoute = "login" | "register" | "password-reset-request";

function rejectRateLimitedRequest(
  req: Request,
  res: Response,
  route: RateLimitedRoute,
  result: { allowed: false; retryAfterSeconds: number },
  origin: string,
  message: string = AUTH_RATE_LIMIT_MESSAGE,
): void {
  req.log.warn({
    event: "auth_attempts_rate_limited",
    route,
    origin,
    retryAfterSeconds: result.retryAfterSeconds,
  }, "authentication attempt rate limit exceeded");
  res.set("Retry-After", String(result.retryAfterSeconds));
  res.status(429).json({
    error: message,
    retryAfterSeconds: result.retryAfterSeconds,
  });
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
  const validated = validateCredentials(req.body, "register");
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;
  const origin = getRequestOrigin(req);
  const attemptKeys = getAuthAttemptKeys("register", data.email, origin);
  const rateLimit = authAttemptLimiter.consume(attemptKeys);
  if (!rateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "register", rateLimit, origin);
    return;
  }

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

    // O workspace nasce no cadastro, e a leitura do workspace passa a ser só
    // leitura. Se o seed falhar aqui, a primeira leitura tenta de novo.
    try {
      await initializeUser(user.id);
    } catch (err) {
      req.log.error({ err }, "workspace initialization at registration failed");
    }

    res.append("Set-Cookie", sessionCookie(await createSession(user.id, user.sessionVersion)));
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    authAttemptLimiter.release(attemptKeys);
    req.log.error({ err }, "registration error");
    res.status(500).json({ error: "Não foi possível criar sua conta agora." });
  }
});

/** POST /api/auth/login — authenticates with a generic failure message. */
router.post("/login", async (req, res) => {
  const validated = validateCredentials(req.body, "login");
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;
  const origin = getRequestOrigin(req);
  const attemptKeys = getAuthAttemptKeys("login", data.email, origin);
  const rateLimit = authAttemptLimiter.consume(attemptKeys);
  if (!rateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "login", rateLimit, origin);
    return;
  }

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, data.email));
    const valid = user ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!valid || !user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    authAttemptLimiter.release(attemptKeys);
    res.append("Set-Cookie", sessionCookie(await createSession(user.id, user.sessionVersion)));
    res.json({ user: publicUser(user) });
  } catch (err) {
    authAttemptLimiter.release(attemptKeys);
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Não foi possível entrar agora." });
  }
});

/** GET /api/auth/session — returns null instead of throwing for visitors. */
router.get("/session", async (req, res) => {
  try {
    const session = await resolveSession(req);
    const [user] = session
      ? await db.select().from(authUsers).where(eq(authUsers.id, session.userId))
      : [];
    if (!user) {
      if (req.headers.cookie) res.append("Set-Cookie", expiredSessionCookie());
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
    // Malformed addresses are rejected before any counter moves, so a typo
    // never costs the caller one of its hourly attempts.
    res.status(400).json({ error: "Digite um e-mail válido." });
    return;
  }

  // Both counters are consumed before the account lookup: an address with an
  // account and one without behave exactly the same under the limit.
  const origin = getRequestOrigin(req);
  const emailRateLimit = passwordResetEmailLimiter.consume(getPasswordResetAttemptKeys("account", email));
  if (!emailRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "password-reset-request", emailRateLimit, origin, PASSWORD_RESET_RATE_LIMIT_MESSAGE);
    return;
  }
  const originRateLimit = passwordResetOriginLimiter.consume(getPasswordResetAttemptKeys("origin", origin));
  if (!originRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "password-reset-request", originRateLimit, origin, PASSWORD_RESET_RATE_LIMIT_MESSAGE);
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
        .set({ passwordHash: await hashPassword(password), updatedAt: now })
        .where(eq(authUsers.id, user.id));
      // A senha mudou: todo aparelho conectado precisa entrar de novo.
      await revokeAllSessions(user.id, tx);
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

/** POST /api/auth/logout — revoga a sessão deste aparelho e limpa o cookie. */
router.post("/logout", async (req, res) => {
  try {
    await revokeCurrentSession(req);
  } catch (err) {
    req.log.error({ err }, "logout revocation error");
    res.status(500).json({ error: "Não foi possível sair agora. Tente novamente." });
    return;
  }
  res.append("Set-Cookie", expiredSessionCookie());
  res.status(204).send();
});

export default router;