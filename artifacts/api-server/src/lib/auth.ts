import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const JWT_ALGORITHM = "HS256";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_KEY_LENGTH = 64;

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
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

export function createSessionToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: JWT_ALGORITHM, typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: userId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  } satisfies JwtPayload));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifySessionToken(token: string): string | null {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: string; typ?: string };
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<JwtPayload>;
    if (header.alg !== JWT_ALGORITHM || header.typ !== "JWT") return null;
    if (!payload.sub || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    const expected = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    return payload.sub;
  } catch {
    return null;
  }
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