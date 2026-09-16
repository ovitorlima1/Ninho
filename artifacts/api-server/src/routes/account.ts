import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  authSessions,
  authUsers,
  budgetCategories,
  checklistItems,
  deleteAccountSchema,
  giftReservations,
  giftShareLinks,
  milestones,
  passwordResetTokens,
  profiles,
} from "@workspace/db/schema";
import { expiredSessionCookie, verifyPassword } from "../lib/auth";
import { accountDeletionLimiter, authAttemptLimiter, limiterKey, passwordResetEmailLimiter } from "../lib/rate-limit";
import { revokeAllSessions } from "../lib/sessions";
import { firstIssueMessage } from "../lib/validation";
import { requireAuth } from "../middlewares/requireAuth";

/** Rotas da conta em si (sessões e LGPD), montadas em `/api/me`. */
const router = Router();

/** POST /api/me/sessions/revoke-all — encerra a conta em todos os aparelhos. */
router.post("/sessions/revoke-all", requireAuth, async (req, res) => {
  try {
    await revokeAllSessions(res.locals.userId as string);
  } catch (err) {
    req.log.error({ err }, "revoke all sessions error");
    res.status(500).json({ error: "Não foi possível sair dos aparelhos agora. Tente novamente." });
    return;
  }
  res.append("Set-Cookie", expiredSessionCookie());
  res.status(204).send();
});

/**
 * GET /api/me/export — todos os dados da conta num arquivo JSON (LGPD, art. 18).
 * O token do link de presentes fica de fora: é uma credencial, não um dado.
 */
router.get("/export", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [account] = await db
      .select({ email: authUsers.email, createdAt: authUsers.createdAt, updatedAt: authUsers.updatedAt })
      .from(authUsers)
      .where(eq(authUsers.id, userId));
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const items = await db.select().from(checklistItems).where(eq(checklistItems.userId, userId)).orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id));
    const userMilestones = await db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(asc(milestones.week));
    const budget = await db.select().from(budgetCategories).where(eq(budgetCategories.userId, userId));
    const shareLinks = await db.select().from(giftShareLinks).where(eq(giftShareLinks.userId, userId)).orderBy(asc(giftShareLinks.id));
    const reservations = await db.select().from(giftReservations).where(eq(giftReservations.userId, userId));
    const sessions = await db
      .select({ createdAt: authSessions.createdAt, lastSeenAt: authSessions.lastSeenAt, expiresAt: authSessions.expiresAt, revokedAt: authSessions.revokedAt })
      .from(authSessions)
      .where(eq(authSessions.userId, userId))
      .orderBy(asc(authSessions.createdAt));

    const omitOwner = <T extends { userId: string }>({ userId: _owner, ...rest }: T) => rest;
    const exportedAt = new Date();
    const payload = {
      app: "Ninho",
      exportedAt: exportedAt.toISOString(),
      account: account ?? null,
      profile: profile ? omitOwner(profile) : null,
      items: items.map((item) => ({ ...omitOwner(item), price: Number(item.price) })),
      milestones: userMilestones.map(omitOwner),
      budget: budget.map((row) => ({ ...omitOwner(row), planned: Number(row.planned) })),
      giftShareLinks: shareLinks.map(({ id, createdAt, revokedAt }) => ({ id, createdAt, revokedAt, active: revokedAt === null })),
      giftReservations: reservations.map(omitOwner),
      sessions,
    };

    const filename = `ninho-meus-dados-${exportedAt.toISOString().slice(0, 10)}.json`;
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.type("application/json").send(JSON.stringify(payload, null, 2));
  } catch (err) {
    req.log.error({ err }, "data export error");
    res.status(500).json({ error: "Não foi possível gerar o arquivo agora. Tente de novo em instantes." });
  }
});

/**
 * DELETE /api/me/account — exclui a conta na hora, com a senha e a palavra
 * EXCLUIR. Tudo sai numa transação: se uma tabela falhar, nada é apagado.
 */
router.delete("/account", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    res.status(400).json({ error: firstIssueMessage(parsed.error), field: issue?.path[0] ?? null });
    return;
  }

  const deletionKey = limiterKey("account-deletion:account", userId);
  const rateLimit = await accountDeletionLimiter.consume([deletionKey]);
  if (!rateLimit.allowed) {
    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.", retryAfterSeconds: rateLimit.retryAfterSeconds });
    return;
  }

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, userId));
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      // 400, não 401: senha errada aqui não é sessão expirada.
      res.status(400).json({ error: "Senha incorreta.", field: "password" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(giftReservations).where(eq(giftReservations.userId, userId));
      await tx.delete(giftShareLinks).where(eq(giftShareLinks.userId, userId));
      await tx.delete(checklistItems).where(eq(checklistItems.userId, userId));
      await tx.delete(milestones).where(eq(milestones.userId, userId));
      await tx.delete(budgetCategories).where(eq(budgetCategories.userId, userId));
      await tx.delete(profiles).where(eq(profiles.userId, userId));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
      await tx.delete(authSessions).where(eq(authSessions.userId, userId));
      await tx.delete(authUsers).where(eq(authUsers.id, userId));
    });

    // Contadores de tentativa ligados à conta também saem (são só hashes).
    await authAttemptLimiter.release([
      limiterKey("login:account", user.email),
      limiterKey("register:account", user.email),
      deletionKey,
    ]);
    await passwordResetEmailLimiter.release([limiterKey("password-reset:account", user.email)]);

    req.log.info({ event: "account_deleted" }, "account deleted");
    res.append("Set-Cookie", expiredSessionCookie());
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "account deletion error");
    res.status(500).json({ error: "Não foi possível excluir sua conta agora. Nada foi apagado; tente de novo em instantes." });
  }
});

export default router;
