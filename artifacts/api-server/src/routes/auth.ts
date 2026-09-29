import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  authUsers,
  emailVerificationSchema,
  emailVerificationTokens,
  loginSchema,
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetTokens,
  registerSchema,
  verificationResendSchema,
} from "@workspace/db/schema";
import {
  dummyPasswordHash,
  expiredSessionCookie,
  hashPassword,
  sessionCookie,
  verifyPassword,
  createPasswordResetToken,
  hashPasswordResetToken,
} from "../lib/auth";
import {
  authAttemptLimiter,
  limiterKey,
  passwordResetEmailLimiter,
  passwordResetOriginLimiter,
  verificationEmailLimiter,
  verificationOriginLimiter,
} from "../lib/rate-limit";
import { accountExistsMessage, passwordResetMessage, sendEmail, verificationMessage, type EmailMessage } from "../lib/email";
import { firstIssueMessage } from "../lib/validation";
import { initializeUser } from "../lib/seed";
import { createSession, resolveSession, revokeAllSessions, revokeCurrentSession } from "../lib/sessions";

const router = Router();

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Tempo mínimo das rotas que respondem igual exista ou não a conta. */
const GENERIC_RESPONSE_MIN_MS = 400;
const GENERIC_RESET_MESSAGE = "Se houver uma conta com este e-mail, enviaremos um link para redefinir sua senha.";
const GENERIC_REGISTER_MESSAGE = "Enviamos um link de confirmação para o seu e-mail. Abra o link para entrar no seu ninho.";
const GENERIC_RESEND_MESSAGE = "Se houver um cadastro esperando confirmação, enviamos um novo link.";
const INVALID_VERIFICATION_MESSAGE = "Este link de confirmação é inválido ou expirou.";
const EMAIL_NOT_VERIFIED_MESSAGE = "Falta confirmar seu e-mail. Abra o link que enviamos ou peça outro.";
const AUTH_RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
const PASSWORD_RESET_RATE_LIMIT_MESSAGE = "Muitos pedidos de redefinição de senha. Aguarde uma hora antes de tentar novamente.";
const VERIFICATION_RATE_LIMIT_MESSAGE = "Muitos pedidos de link de confirmação. Aguarde uma hora antes de tentar novamente.";

function publicUser(user: typeof authUsers.$inferSelect) {
  return { id: user.id, email: user.email };
}

function getRequestOrigin(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getAuthAttemptKeys(scope: "login" | "register", email: string, origin: string): string[] {
  return [limiterKey(`${scope}:origin`, origin), limiterKey(`${scope}:account`, email)];
}

/**
 * Password reset counters live in their own limiters, so the e-mail and the
 * origin quotas can differ. Each limiter receives a single key.
 */
function getPasswordResetAttemptKeys(scope: "origin" | "account", value: string): string[] {
  return [limiterKey(`password-reset:${scope}`, value)];
}

function getVerificationAttemptKeys(scope: "origin" | "account", value: string): string[] {
  return [limiterKey(`verification-resend:${scope}`, value)];
}

type RateLimitedRoute = "login" | "register" | "password-reset-request" | "verification-resend";

function rejectRateLimitedRequest(
  req: Request,
  res: Response,
  route: RateLimitedRoute,
  result: { allowed: false; retryAfterSeconds: number },
  message: string = AUTH_RATE_LIMIT_MESSAGE,
): void {
  // Sem IP nem e-mail no log: a rota e o tempo de espera bastam para alertas.
  req.log.warn({
    event: "auth_attempts_rate_limited",
    route,
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
  // Fora de produção, http://localhost vale para rodar o cadastro na máquina.
  const localDevelopment = process.env.NODE_ENV !== "production"
    && url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("PUBLIC_APP_URL must use HTTPS.");
  }
  return url.origin;
}

async function waitForMinimumResponseTime(startedAt: number): Promise<void> {
  const remaining = GENERIC_RESPONSE_MIN_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

/** Envia sem segurar a resposta: a falha vai para o log, nunca para quem pediu. */
function deliver(req: Request, message: EmailMessage, kind: string): void {
  void sendEmail(message).catch((err: unknown) => {
    req.log.error({ err, email: kind }, "email delivery error");
  });
}

/** Grava um link de confirmação com a senha deste cadastro e manda o e-mail. */
async function issueVerification(req: Request, user: { id: string; email: string }, passwordHash: string, publicAppUrl: string): Promise<void> {
  const { token, tokenHash } = createPasswordResetToken();
  await db.insert(emailVerificationTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash,
    passwordHash,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });
  const verifyUrl = `${publicAppUrl}/verify-email?token=${encodeURIComponent(token)}`;
  deliver(req, verificationMessage(user.email, verifyUrl), "verification");
}

/**
 * POST /api/auth/register — nunca cria sessão. A resposta é a mesma, no mesmo
 * tempo mínimo, exista ou não conta com o e-mail; o que muda é o e-mail enviado.
 */
router.post("/register", async (req, res) => {
  const startedAt = Date.now();
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const { data } = parsed;
  const origin = getRequestOrigin(req);
  const attemptKeys = getAuthAttemptKeys("register", data.email, origin);
  const rateLimit = await authAttemptLimiter.consume(attemptKeys);
  if (!rateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "register", rateLimit);
    return;
  }

  try {
    const publicAppUrl = getPublicAppUrl();
    // O hash acontece sempre: o tempo não denuncia se a conta existe.
    const passwordHash = await hashPassword(data.password);
    const [existing] = await db.select().from(authUsers).where(eq(authUsers.email, data.email));
    if (existing?.emailVerifiedAt) {
      deliver(req, accountExistsMessage(existing.email, `${publicAppUrl}/sign-in`, `${publicAppUrl}/forgot-password`), "account-exists");
    } else {
      // Conta nova, ou cadastro repetido antes da confirmação: o link novo leva a senha deste cadastro.
      const user = existing ?? (await db.insert(authUsers).values({
        id: randomUUID(),
        email: data.email,
        passwordHash,
        emailVerifiedAt: null,
      }).returning())[0];
      if (!user) throw new Error("account insert returned no row");
      await issueVerification(req, user, passwordHash, publicAppUrl);
    }
  } catch (err) {
    await authAttemptLimiter.release(attemptKeys);
    req.log.error({ err }, "registration error");
    res.status(500).json({ error: "Não foi possível criar sua conta agora." });
    return;
  }

  await waitForMinimumResponseTime(startedAt);
  res.status(202).json({ message: GENERIC_REGISTER_MESSAGE });
});

/**
 * POST /api/auth/verify-email — gasta o link, confirma a conta com a senha do
 * cadastro que gerou o link, prepara a lista e abre a sessão.
 */
router.post("/verify-email", async (req, res) => {
  const parsed = emailVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: INVALID_VERIFICATION_MESSAGE });
    return;
  }

  try {
    const now = new Date();
    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const user = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now),
        ))
        .returning({ userId: emailVerificationTokens.userId, passwordHash: emailVerificationTokens.passwordHash });
      if (!claimed) return null;

      const [verified] = await tx
        .update(authUsers)
        .set({ emailVerifiedAt: now, passwordHash: claimed.passwordHash, updatedAt: now })
        .where(eq(authUsers.id, claimed.userId))
        .returning();
      if (!verified) return null;

      // Os outros links da conta (de cadastros repetidos) deixam de valer.
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(and(eq(emailVerificationTokens.userId, verified.id), isNull(emailVerificationTokens.usedAt)));
      return verified;
    });

    if (!user) {
      res.status(400).json({ error: INVALID_VERIFICATION_MESSAGE });
      return;
    }

    // A lista nasce na confirmação; se falhar, a primeira leitura tenta de novo.
    try {
      await initializeUser(user.id);
    } catch (err) {
      req.log.error({ err }, "workspace initialization at verification failed");
    }

    res.append("Set-Cookie", sessionCookie(await createSession(user.id, user.sessionVersion)));
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "email verification error");
    res.status(500).json({ error: "Não foi possível confirmar seu e-mail agora." });
  }
});

/** POST /api/auth/verify-email/resend — responde sempre igual; só envia para cadastro não confirmado. */
router.post("/verify-email/resend", async (req, res) => {
  const startedAt = Date.now();
  const parsed = verificationResendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const { email } = parsed.data;

  const emailRateLimit = await verificationEmailLimiter.consume(getVerificationAttemptKeys("account", email));
  if (!emailRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "verification-resend", emailRateLimit, VERIFICATION_RATE_LIMIT_MESSAGE);
    return;
  }
  const originRateLimit = await verificationOriginLimiter.consume(getVerificationAttemptKeys("origin", getRequestOrigin(req)));
  if (!originRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "verification-resend", originRateLimit, VERIFICATION_RATE_LIMIT_MESSAGE);
    return;
  }

  try {
    const publicAppUrl = getPublicAppUrl();
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email));
    if (user && !user.emailVerifiedAt) {
      await issueVerification(req, user, user.passwordHash, publicAppUrl);
    }
  } catch (err) {
    // Detalhe de banco ou de envio não pode virar sinal de que a conta existe.
    req.log.error({ err }, "verification resend error");
  }

  await waitForMinimumResponseTime(startedAt);
  res.status(202).json({ message: GENERIC_RESEND_MESSAGE });
});

/** POST /api/auth/login — authenticates with a generic failure message. */
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const { data } = parsed;
  const origin = getRequestOrigin(req);
  const attemptKeys = getAuthAttemptKeys("login", data.email, origin);
  const rateLimit = await authAttemptLimiter.consume(attemptKeys);
  if (!rateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "login", rateLimit);
    return;
  }

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, data.email));
    // Sem conta, compara com um hash fictício: o tempo de resposta é o mesmo.
    const valid = await verifyPassword(data.password, user?.passwordHash ?? await dummyPasswordHash());
    if (!valid || !user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    await authAttemptLimiter.release(attemptKeys);
    // Só depois da senha certa: quem não sabe a senha não descobre nada da conta.
    if (!user.emailVerifiedAt) {
      res.status(403).json({ error: EMAIL_NOT_VERIFIED_MESSAGE, code: "email_not_verified" });
      return;
    }
    res.append("Set-Cookie", sessionCookie(await createSession(user.id, user.sessionVersion)));
    res.json({ user: publicUser(user) });
  } catch (err) {
    await authAttemptLimiter.release(attemptKeys);
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
  const parsed = passwordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    // Malformed addresses are rejected before any counter moves, so a typo
    // never costs the caller one of its hourly attempts.
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const { email } = parsed.data;

  // Both counters are consumed before the account lookup: an address with an
  // account and one without behave exactly the same under the limit.
  const origin = getRequestOrigin(req);
  const emailRateLimit = await passwordResetEmailLimiter.consume(getPasswordResetAttemptKeys("account", email));
  if (!emailRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "password-reset-request", emailRateLimit, PASSWORD_RESET_RATE_LIMIT_MESSAGE);
    return;
  }
  const originRateLimit = await passwordResetOriginLimiter.consume(getPasswordResetAttemptKeys("origin", origin));
  if (!originRateLimit.allowed) {
    rejectRateLimitedRequest(req, res, "password-reset-request", originRateLimit, PASSWORD_RESET_RATE_LIMIT_MESSAGE);
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
      deliver(req, passwordResetMessage(user.email, resetUrl), "password-reset");
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
  const parsed = passwordResetCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssueMessage(parsed.error) });
    return;
  }
  const { token, password } = parsed.data;

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
        .select({ id: authUsers.id, emailVerifiedAt: authUsers.emailVerifiedAt })
        .from(authUsers)
        .where(eq(authUsers.id, claimed.userId));
      if (!user) return false;

      // O link chegou no e-mail da conta: isso também confirma o endereço.
      await tx
        .update(authUsers)
        .set({ passwordHash: await hashPassword(password), updatedAt: now, emailVerifiedAt: user.emailVerifiedAt ?? now })
        .where(eq(authUsers.id, user.id));
      // Um link de confirmação antigo não pode trocar a senha nova pela do cadastro.
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt)));
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