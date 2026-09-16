import { createHmac } from "node:crypto";
import { beforeAll, expect, test } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

const SECRET = "vitest-session-secret-0123456789-abcdef";

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

function legacyToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId, sv: 0, iat: now, exp: now + 60 })}`;
  const signature = createHmac("sha256", SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

test("o token carrega a sessão do aparelho", () => {
  const token = createSessionToken("user-1", "sessao-1", 3);
  expect(verifySessionToken(token)).toEqual({ userId: "user-1", sessionId: "sessao-1", sessionVersion: 3 });
});

test("token anterior às sessões registradas (sem sid) é recusado", () => {
  expect(verifySessionToken(legacyToken("user-1"))).toBeNull();
});

test("token com assinatura alterada é recusado", () => {
  const token = createSessionToken("user-1", "sessao-1");
  expect(verifySessionToken(`${token.slice(0, -2)}xx`)).toBeNull();
});
