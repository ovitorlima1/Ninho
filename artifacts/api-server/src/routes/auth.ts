import { randomUUID } from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { authUsers } from "@workspace/db/schema";
import {
  createSessionToken,
  expiredSessionCookie,
  hashPassword,
  SESSION_COOKIE,
  sessionCookie,
  verifyPassword,
  parseCookieHeader,
  verifySessionToken,
} from "../lib/auth";

const router = Router();

type Credentials = { email: string; password: string };

function validateCredentials(body: unknown): { data: Credentials } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Confira os dados informados." };
  const values = body as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return { error: "Digite um e-mail válido." };
  }
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password.length > 128) return { error: "A senha deve ter no máximo 128 caracteres." };
  return { data: { email, password } };
}

function publicUser(user: typeof authUsers.$inferSelect) {
  return { id: user.id, email: user.email };
}

/** POST /api/auth/register — creates a new Ninho account and its session. */
router.post("/register", async (req, res) => {
  const validated = validateCredentials(req.body);
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;

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

    res.append("Set-Cookie", sessionCookie(createSessionToken(user.id)));
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "registration error");
    res.status(500).json({ error: "Não foi possível criar sua conta agora." });
  }
});

/** POST /api/auth/login — authenticates with a generic failure message. */
router.post("/login", async (req, res) => {
  const validated = validateCredentials(req.body);
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const { data } = validated;

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, data.email));
    const valid = user ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!valid || !user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    res.append("Set-Cookie", sessionCookie(createSessionToken(user.id)));
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Não foi possível entrar agora." });
  }
});

/** GET /api/auth/session — returns null instead of throwing for visitors. */
router.get("/session", async (req, res) => {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) {
    res.json({ user: null });
    return;
  }

  try {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, userId));
    if (!user) {
      res.append("Set-Cookie", expiredSessionCookie());
      res.json({ user: null });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "session lookup error");
    res.status(500).json({ error: "Não foi possível verificar sua sessão." });
  }
});

/** POST /api/auth/logout — clears the browser session cookie. */
router.post("/logout", (_req, res) => {
  res.append("Set-Cookie", expiredSessionCookie());
  res.status(204).send();
});

export default router;