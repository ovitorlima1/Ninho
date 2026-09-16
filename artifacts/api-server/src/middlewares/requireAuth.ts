import type { NextFunction, Request, Response } from "express";
import { parseCookieHeader, SESSION_COOKIE } from "../lib/auth";
import { resolveSession } from "../lib/sessions";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!parseCookieHeader(req.headers.cookie, SESSION_COOKIE)) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  try {
    const session = await resolveSession(req);
    if (!session) {
      res.status(401).json({ error: "Sessão expirada. Entre novamente." });
      return;
    }
    res.locals.userId = session.userId;
    res.locals.sessionId = session.sessionId;
    next();
  } catch (err) {
    req.log.error({ err }, "session validation error");
    res.status(500).json({ error: "Não foi possível verificar sua sessão." });
  }
}
