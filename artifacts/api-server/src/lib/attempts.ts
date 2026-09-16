/**
 * Regra dos limites de tentativa, sem banco — testada em `attempts.test.ts`.
 * A persistência fica em `rate-limit.ts`.
 */
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type LimitPolicy = {
  windowMs: number;
  blockMs: number;
  maxAttempts: number;
};

export const AUTH_POLICY: LimitPolicy = { windowMs: 15 * MINUTE_MS, blockMs: 15 * MINUTE_MS, maxAttempts: 5 };
export const PASSWORD_RESET_EMAIL_POLICY: LimitPolicy = { windowMs: HOUR_MS, blockMs: HOUR_MS, maxAttempts: 3 };
export const PASSWORD_RESET_ORIGIN_POLICY: LimitPolicy = { windowMs: HOUR_MS, blockMs: HOUR_MS, maxAttempts: 10 };
export const ACCOUNT_DELETION_POLICY: LimitPolicy = { windowMs: 15 * MINUTE_MS, blockMs: 15 * MINUTE_MS, maxAttempts: 5 };
export const GIFT_RESERVATION_POLICY: LimitPolicy = { windowMs: HOUR_MS, blockMs: HOUR_MS, maxAttempts: 20 };

export type AttemptState = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number | null;
};

export type AttemptLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Estado vigente de uma chave: `null` quando a janela ou o bloqueio já passou. */
function activeState(state: AttemptState | undefined, now: number, policy: LimitPolicy): AttemptState | null {
  if (!state) return null;
  if (state.blockedUntil !== null) return state.blockedUntil > now ? state : null;
  return now - state.windowStartedAt < policy.windowMs ? state : null;
}

/**
 * Regra pura: confere todas as chaves e, se nenhuma estiver bloqueada, reserva
 * uma tentativa em cada uma. Devolve o resultado e o novo estado das chaves
 * que mudaram. Origem e conta são chaves separadas, então trocar só uma delas
 * não escapa do limite.
 */
export function consumeAttempts(
  states: Readonly<Record<string, AttemptState | undefined>>,
  keys: readonly string[],
  now: number,
  policy: LimitPolicy,
): { result: AttemptLimitResult; next: Record<string, AttemptState> } {
  const distinct = [...new Set(keys)];
  const next: Record<string, AttemptState> = {};
  let retryAfterMs = 0;

  for (const key of distinct) {
    const state = activeState(states[key], now, policy);
    if (!state) continue;
    if (state.blockedUntil !== null) {
      retryAfterMs = Math.max(retryAfterMs, state.blockedUntil - now);
    } else if (state.count >= policy.maxAttempts) {
      next[key] = { ...state, blockedUntil: now + policy.blockMs };
      retryAfterMs = Math.max(retryAfterMs, policy.blockMs);
    }
  }
  if (retryAfterMs > 0) {
    return { result: { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }, next };
  }

  for (const key of distinct) {
    const state = activeState(states[key], now, policy) ?? { count: 0, windowStartedAt: now, blockedUntil: null };
    const count = state.count + 1;
    next[key] = {
      count,
      windowStartedAt: state.windowStartedAt,
      blockedUntil: count >= policy.maxAttempts ? now + policy.blockMs : null,
    };
  }
  return { result: { allowed: true }, next };
}
