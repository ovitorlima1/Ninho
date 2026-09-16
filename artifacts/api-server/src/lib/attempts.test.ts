import { expect, test } from "vitest";
import {
  AUTH_POLICY,
  consumeAttempts,
  PASSWORD_RESET_EMAIL_POLICY,
  PASSWORD_RESET_ORIGIN_POLICY,
  type AttemptLimitResult,
  type AttemptState,
  type LimitPolicy,
} from "./attempts";

const HOUR_MS = 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 11, 12, 0, 0);

/** Loja em memória com a mesma regra usada pelo limitador do banco. */
function memoryLimiter(policy: LimitPolicy) {
  const store: Record<string, AttemptState> = {};
  return {
    store,
    consume(keys: string[], now: number): AttemptLimitResult {
      const { result, next } = consumeAttempts(store, keys, now, policy);
      Object.assign(store, next);
      return result;
    },
  };
}

test("permite três pedidos de recuperação por e-mail e bloqueia o quarto", () => {
  const limiter = memoryLimiter(PASSWORD_RESET_EMAIL_POLICY);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    expect(limiter.consume(["email"], START + attempt), `tentativa ${attempt}`).toEqual({ allowed: true });
  }
  expect(limiter.consume(["email"], START + 4).allowed).toBe(false);
});

test("permite dez pedidos por origem e bloqueia o décimo primeiro", () => {
  const limiter = memoryLimiter(PASSWORD_RESET_ORIGIN_POLICY);
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    expect(limiter.consume(["origin"], START + attempt)).toEqual({ allowed: true });
  }
  expect(limiter.consume(["origin"], START + 11).allowed).toBe(false);
});

test("informa um retryAfterSeconds positivo e limitado ao bloqueio", () => {
  const limiter = memoryLimiter(PASSWORD_RESET_EMAIL_POLICY);
  for (let attempt = 1; attempt <= 3; attempt += 1) limiter.consume(["email"], START + attempt);
  const result = limiter.consume(["email"], START + 4);
  expect(result.allowed).toBe(false);
  const retry = result.allowed ? 0 : result.retryAfterSeconds;
  expect(retry).toBeGreaterThan(0);
  expect(retry).toBeLessThanOrEqual(HOUR_MS / 1000);
});

test("volta a aceitar depois que o bloqueio passa", () => {
  const limiter = memoryLimiter(PASSWORD_RESET_EMAIL_POLICY);
  for (let attempt = 1; attempt <= 3; attempt += 1) limiter.consume(["email"], START + attempt);
  expect(limiter.consume(["email"], START + HOUR_MS - 1000).allowed).toBe(false);
  expect(limiter.consume(["email"], START + 3 + HOUR_MS + 1)).toEqual({ allowed: true });
});

test("uma chave bloqueada barra a requisição sem gastar tentativa das outras", () => {
  const limiter = memoryLimiter(AUTH_POLICY);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    expect(limiter.consume([`origin-${attempt}`, "account"], START + attempt)).toEqual({ allowed: true });
  }
  // A conta chegou ao limite: trocar a origem não adianta.
  expect(limiter.consume(["origin-nova", "account"], START + 6).allowed).toBe(false);
  expect(limiter.store["origin-nova"]).toBeUndefined();
});

test("a janela vencida recomeça a contagem", () => {
  const limiter = memoryLimiter(AUTH_POLICY);
  for (let attempt = 1; attempt <= 4; attempt += 1) limiter.consume(["account"], START + attempt);
  expect(limiter.consume(["account"], START + AUTH_POLICY.windowMs + 10)).toEqual({ allowed: true });
  expect(limiter.store.account?.count).toBe(1);
});
