import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { authUsers } from "@workspace/db/schema";
import {
  parseCookieHeader,
  SESSION_COOKIE,
  verifySessionToken,
} from "../lib/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const claims = token ? verifySessionToken(token) : null;
  if (!claims) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  try {
    const [user] = await db
      .select({ id: authUsers.id, sessionVersion: authUsers.sessionVersion })
      .from(authUsers)
      .where(eq(authUsers.id, claims.userId));
    if (!user || user.sessionVersion !== claims.sessionVersion) {
      res.status(401).json({ error: "Sessão expirada. Entre novamente." });
      return;
    }
    res.locals.userId = user.id;
    next();
  } catch (err) {
    req.log.error({ err }, "session validation error");
    res.status(500).json({ error: "Não foi possível verificar sua sessão." });
  }
}
