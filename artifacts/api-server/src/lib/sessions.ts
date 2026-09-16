import type { Request } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { authSessions, authUsers } from "@workspace/db/schema";
import {
  createSessionId,
  createSessionToken,
  parseCookieHeader,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "./auth";

/** `last_seen_at` é gravado no máximo uma vez nesse intervalo por sessão. */
const LAST_SEEN_THROTTLE_MS = 15 * 60 * 1000;

type Executor = Pick<typeof db, "insert" | "update">;

export type ActiveSession = {
  userId: string;
  sessionId: string;
};

/** Registra um aparelho e devolve o token que vai no cookie. */
export async function createSession(
  userId: string,
  sessionVersion: number,
  executor: Executor = db,
): Promise<string> {
  const id = createSessionId();
  await executor.insert(authSessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  });
  return createSessionToken(userId, id, sessionVersion);
}

/**
 * Valida o cookie contra o banco: a sessão precisa existir, estar ativa, não ter
 * vencido e a versão de sessão da conta precisa bater com a do token.
 */
export async function resolveSession(req: Request): Promise<ActiveSession | null> {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const claims = token ? verifySessionToken(token) : null;
  if (!claims) return null;

  const [row] = await db
    .select({
      userId: authSessions.userId,
      expiresAt: authSessions.expiresAt,
      revokedAt: authSessions.revokedAt,
      lastSeenAt: authSessions.lastSeenAt,
      sessionVersion: authUsers.sessionVersion,
    })
    .from(authSessions)
    .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
    .where(eq(authSessions.id, claims.sessionId));

  const now = Date.now();
  if (
    !row
    || row.userId !== claims.userId
    || row.revokedAt
    || row.expiresAt.getTime() <= now
    || row.sessionVersion !== claims.sessionVersion
  ) {
    return null;
  }

  if (now - row.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await db
      .update(authSessions)
      .set({ lastSeenAt: new Date(now) })
      .where(eq(authSessions.id, claims.sessionId));
  }
  return { userId: row.userId, sessionId: claims.sessionId };
}

/** Encerra só o aparelho que fez a requisição. Cookie inválido: nada a fazer. */
export async function revokeCurrentSession(req: Request): Promise<void> {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const claims = token ? verifySessionToken(token) : null;
  if (!claims) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, claims.sessionId), isNull(authSessions.revokedAt)));
}

/**
 * Encerra todos os aparelhos da conta. A versão de sessão também sobe, então
 * nenhum token emitido antes continua valendo, nem se a linha sumir.
 */
export async function revokeAllSessions(userId: string, executor: Executor = db): Promise<void> {
  const now = new Date();
  await executor
    .update(authSessions)
    .set({ revokedAt: now })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  await executor
    .update(authUsers)
    .set({ sessionVersion: sql`${authUsers.sessionVersion} + 1`, updatedAt: now })
    .where(eq(authUsers.id, userId));
}
