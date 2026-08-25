import type { NextFunction, Request, Response } from "express";
import {
  parseCookieHeader,
  SESSION_COOKIE,
  verifySessionToken,
} from "../lib/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = parseCookieHeader(req.headers.cookie, SESSION_COOKIE);
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  res.locals.userId = userId;
  next();
}
