import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const JWT_ALGORITHM = "HS256";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_KEY_LENGTH = 64;
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_BLOCK_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 5;
const AUTH_ATTEMPT_MAX_ENTRIES = 10_000;
const PASSWORD_RESET_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_ATTEMPT_BLOCK_MS = 60 * 60 * 1000;
const PASSWORD_RESET_EMAIL_ATTEMPT_LIMIT = 3;
const PASSWORD_RESET_ORIGIN_ATTEMPT_LIMIT = 10;

type AttemptBucket = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
};

export type AuthAttemptLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type AuthAttemptLimiterOptions = {
  windowMs?: number;
  blockMs?: number;
  maxAttempts?: number;
  maxEntries?: number;
};

/**
 * Process-local limiter used before password work starts.
 *
 * The origin and account keys are supplied separately by the route so an
 * attacker cannot avoid the limit simply by changing one of them. The map is
 * bounded and expired entries are pruned to avoid turning the limiter into an
 * unbounded memory sink.
 */
export class AuthAttemptLimiter {
  private readonly buckets = new Map<string, AttemptBucket>();
  private readonly windowMs: number;
  private readonly blockMs: number;
  private readonly maxAttempts: number;
  private readonly maxEntries: number;

  constructor(options: AuthAttemptLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? AUTH_ATTEMPT_WINDOW_MS;
    this.blockMs = options.blockMs ?? AUTH_ATTEMPT_BLOCK_MS;
    this.maxAttempts = options.maxAttempts ?? AUTH_ATTEMPT_LIMIT;
    this.maxEntries = options.maxEntries ?? AUTH_ATTEMPT_MAX_ENTRIES;
  }

  check(keys: readonly string[], now = Date.now()): AuthAttemptLimitResult {
    let retryAfterSeconds = 0;
    for (const key of keys) {
      const bucket = this.getActiveBucket(key, now);
      if (!bucket) continue;

      if (bucket.blockedUntil > now) {
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          Math.ceil((bucket.blockedUntil - now) / 1000),
        );
      } else if (bucket.count >= this.maxAttempts) {
        bucket.blockedUntil = now + this.blockMs;
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          Math.ceil(this.blockMs / 1000),
        );
      }
    }

    return retryAfterSeconds > 0
      ? { allowed: false, retryAfterSeconds }
      : { allowed: true };
  }

  /**
   * Atomically checks and reserves one attempt for every supplied key.
   * A caller can release the reservation after a successful login.
   */
  consume(keys: readonly string[], now = Date.now()): AuthAttemptLimitResult {
    const distinctKeys = [...new Set(keys)];
    const result = this.check(distinctKeys, now);
    if (!result.allowed) return result;

    this.prune(now);
    const missingKeyCount = distinctKeys.filter((key) => !this.buckets.has(key)).length;
    if (!this.ensureCapacity(missingKeyCount)) {
      return { allowed: false, retryAfterSeconds: Math.ceil(this.blockMs / 1000) };
    }

    for (const key of distinctKeys) {
      const bucket = this.getActiveBucket(key, now) ?? {
        count: 0,
        windowStartedAt: now,
        blockedUntil: 0,
      };
      bucket.count += 1;
      if (bucket.count >= this.maxAttempts) {
        bucket.blockedUntil = now + this.blockMs;
      }
      this.buckets.set(key, bucket);
    }

    return { allowed: true };
  }

  release(keys: readonly string[]): void {
    for (const key of keys) {
      this.buckets.delete(key);
    }
  }

  private getActiveBucket(key: string, now: number): AttemptBucket | undefined {
    const bucket = this.buckets.get(key);
    if (!bucket) return undefined;

    const expired =
      (bucket.blockedUntil > 0 && bucket.blockedUntil <= now) ||
      now - bucket.windowStartedAt >= this.windowMs;
    if (expired) {
      this.buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (
        (bucket.blockedUntil > 0 && bucket.blockedUntil <= now) ||
        now - bucket.windowStartedAt >= this.windowMs
      ) {
        this.buckets.delete(key);
      }
    }
  }

  private ensureCapacity(requiredSlots: number): boolean {
    // Active counters are security state: evicting one before it reaches the
    // threshold would let an attacker restart the password-attempt sequence.
    // Expired entries are removed by prune() before this check.
    return this.buckets.size + requiredSlots <= this.maxEntries;
  }
}

export const authAttemptLimiter = new AuthAttemptLimiter();

/**
 * Password reset requests are limited per e-mail address, so a single account
 * cannot be flooded with recovery messages. The route consumes the attempt
 * before looking the account up, keeping existing and unknown addresses
 * indistinguishable.
 */
export const passwordResetEmailLimiter = new AuthAttemptLimiter({
  windowMs: PASSWORD_RESET_ATTEMPT_WINDOW_MS,
  blockMs: PASSWORD_RESET_ATTEMPT_BLOCK_MS,
  maxAttempts: PASSWORD_RESET_EMAIL_ATTEMPT_LIMIT,
});

/**
 * Companion limiter keyed by request origin: it caps how many distinct
 * addresses a single caller can probe within the same hour.
 */
export const passwordResetOriginLimiter = new AuthAttemptLimiter({
  windowMs: PASSWORD_RESET_ATTEMPT_WINDOW_MS,
  blockMs: PASSWORD_RESET_ATTEMPT_BLOCK_MS,
  maxAttempts: PASSWORD_RESET_ORIGIN_ATTEMPT_LIMIT,
});

type JwtPayload = {
  sub: string;
  sid: string;
  sv: number;
  iat: number;
  exp: number;
};

export type SessionClaims = {
  userId: string;
  sessionId: string;
  sessionVersion: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", getSessionSecret()).update(input).digest("base64url");
}

function derivePasswordKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derivePasswordKey(password, salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltEncoded, hashEncoded] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) return false;

  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    const actual = await derivePasswordKey(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createSessionToken(userId: string, sessionId: string, sessionVersion = 0): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: JWT_ALGORITHM, typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: userId,
    sid: sessionId,
    sv: sessionVersion,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  } satisfies JwtPayload));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifySessionToken(token: string): SessionClaims | null {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: string; typ?: string };
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<JwtPayload>;
    if (header.alg !== JWT_ALGORITHM || header.typ !== "JWT") return null;
    if (!payload.sub || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    // Tokens anteriores às sessões registradas não têm `sid` e deixam de valer.
    if (!payload.sid || typeof payload.sid !== "string") return null;
    const sessionVersion = typeof payload.sv === "number" && Number.isInteger(payload.sv) ? payload.sv : 0;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    const expected = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    return { userId: payload.sub, sessionId: payload.sid, sessionVersion };
  } catch {
    return null;
  }
}

export function createPasswordResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export const SESSION_COOKIE = "ninho_session";
export const SESSION_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;

export function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function sessionCookie(token: string, maxAgeMs = SESSION_MAX_AGE_MS): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAgeMs / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function expiredSessionCookie(): string {
  return sessionCookie("", 0);
}