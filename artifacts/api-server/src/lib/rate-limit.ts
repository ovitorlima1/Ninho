import { createHmac } from "node:crypto";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { authAttempts } from "@workspace/db/schema";
import {
  ACCOUNT_DELETION_POLICY,
  AUTH_POLICY,
  consumeAttempts,
  GIFT_RESERVATION_POLICY,
  PASSWORD_RESET_EMAIL_POLICY,
  PASSWORD_RESET_ORIGIN_POLICY,
  type AttemptLimitResult,
  type AttemptState,
  type LimitPolicy,
} from "./attempts";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A cada tantas chamadas, apaga contadores vencidos há mais de um dia. */
const CLEANUP_EVERY = 100;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set.");
  return secret;
}

/**
 * Chave guardada no banco: o escopo em claro e o valor (e-mail, IP, id) só
 * como HMAC — a tabela não vira uma lista de e-mails e IPs.
 */
export function limiterKey(scope: string, value: string): string {
  const digest = createHmac("sha256", getSecret()).update(`${scope}|${value}`).digest("base64url");
  return `${scope}:${digest}`;
}

let callsSinceCleanup = 0;

async function cleanupExpired(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - DAY_MS);
  await db.delete(authAttempts).where(and(
    lt(authAttempts.windowStartedAt, cutoff),
    or(isNull(authAttempts.blockedUntil), lt(authAttempts.blockedUntil, cutoff)),
  ));
}

/**
 * Limitador compartilhado por todos os processos da API (autoscale). Cada
 * chamada é uma transação curta com as linhas das chaves travadas.
 */
export class PersistentLimiter {
  constructor(private readonly policy: LimitPolicy) {}

  async consume(keys: readonly string[], nowMs = Date.now()): Promise<AttemptLimitResult> {
    // Ordem fixa das chaves para duas requisições nunca travarem em ordem inversa.
    const distinct = [...new Set(keys)].sort();
    if (distinct.length === 0) return { allowed: true };
    const now = new Date(nowMs);

    const result = await db.transaction(async (tx) => {
      // Garante as linhas antes do FOR UPDATE: linha inexistente não trava.
      await tx
        .insert(authAttempts)
        .values(distinct.map((key) => ({ key, count: 0, windowStartedAt: now })))
        .onConflictDoNothing();
      const rows = await tx
        .select()
        .from(authAttempts)
        .where(inArray(authAttempts.key, distinct))
        .orderBy(authAttempts.key)
        .for("update");

      const states: Record<string, AttemptState> = {};
      for (const row of rows) {
        states[row.key] = {
          count: row.count,
          windowStartedAt: row.windowStartedAt.getTime(),
          blockedUntil: row.blockedUntil ? row.blockedUntil.getTime() : null,
        };
      }

      const decision = consumeAttempts(states, distinct, nowMs, this.policy);
      for (const [key, state] of Object.entries(decision.next)) {
        await tx
          .update(authAttempts)
          .set({
            count: state.count,
            windowStartedAt: new Date(state.windowStartedAt),
            blockedUntil: state.blockedUntil === null ? null : new Date(state.blockedUntil),
          })
          .where(eq(authAttempts.key, key));
      }
      return decision.result;
    });

    callsSinceCleanup += 1;
    if (callsSinceCleanup >= CLEANUP_EVERY) {
      callsSinceCleanup = 0;
      void cleanupExpired(now).catch((err: unknown) => {
        logger.warn({ err }, "auth attempt cleanup failed");
      });
    }
    return result;
  }

  /**
   * Zera as chaves (ex.: login certo). Uma falha aqui só deixa o contador como
   * estava, então não derruba a resposta.
   */
  async release(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await db.delete(authAttempts).where(inArray(authAttempts.key, [...keys]));
    } catch (err) {
      logger.warn({ err }, "auth attempt release failed");
    }
  }
}

export const authAttemptLimiter = new PersistentLimiter(AUTH_POLICY);
export const passwordResetEmailLimiter = new PersistentLimiter(PASSWORD_RESET_EMAIL_POLICY);
export const passwordResetOriginLimiter = new PersistentLimiter(PASSWORD_RESET_ORIGIN_POLICY);
export const accountDeletionLimiter = new PersistentLimiter(ACCOUNT_DELETION_POLICY);
export const giftReservationLimiter = new PersistentLimiter(GIFT_RESERVATION_POLICY);
