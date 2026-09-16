import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Cabeçalhos de toda resposta da API. É JSON, então nada aqui precisa ser
 * incorporado em outra página, e nenhum recurso do navegador é necessário.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/** Respostas com dados da conta nunca vão para cache de navegador ou proxy. */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set("Cache-Control", "no-store");
  next();
}

export type OriginCheck = {
  method: string;
  origin: string | undefined;
  secFetchSite: string | undefined;
  hostname: string;
  production: boolean;
  allowedOrigins: readonly string[];
};

function parseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Regra pura da checagem de origem para requisições que alteram dados.
 * Sem `Origin` (clientes que não são navegador) passa, a não ser que o
 * navegador tenha dito que a requisição veio de outro site.
 */
export function isAllowedOrigin(check: OriginCheck): boolean {
  if (!UNSAFE_METHODS.has(check.method.toUpperCase())) return true;

  if (!check.origin) return check.secFetchSite !== "cross-site";
  if (check.origin === "null") return false;

  const origin = parseOrigin(check.origin);
  if (!origin) return false;
  if (origin.hostname === check.hostname) return true;
  if (check.allowedOrigins.includes(origin.origin)) return true;
  // O proxy do Vite troca o Host pelo da API; em desenvolvimento o front local vale.
  return !check.production && LOCAL_HOSTNAMES.has(origin.hostname);
}

function configuredOrigins(): string[] {
  const values = [process.env.PUBLIC_APP_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")];
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => parseOrigin(value)?.origin)
    .filter((value): value is string => Boolean(value));
}

/** Bloqueia POST/PUT/PATCH/DELETE disparados por outros sites (CSRF). */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const allowed = isAllowedOrigin({
    method: req.method,
    origin: req.get("origin"),
    secFetchSite: req.get("sec-fetch-site"),
    hostname: req.hostname,
    production: process.env.NODE_ENV === "production",
    allowedOrigins: configuredOrigins(),
  });
  if (allowed) {
    next();
    return;
  }
  req.log.warn({ event: "cross_origin_blocked", method: req.method }, "cross-origin request blocked");
  res.status(403).json({ error: "Origem não permitida." });
}

/** Rotas inexistentes respondem em JSON, sem a página HTML padrão do Express. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Não encontrado." });
}

/**
 * Último tratador: corpo ilegível ou grande demais vira 400/413 com mensagem
 * em pt-BR; o resto vira 500 genérico, sem detalhes internos na resposta.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const type = err && typeof err === "object" && "type" in err ? (err as { type?: unknown }).type : undefined;
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "Não conseguimos ler os dados enviados." });
    return;
  }
  if (type === "entity.too.large") {
    res.status(413).json({ error: "Os dados enviados são grandes demais." });
    return;
  }
  if (type === "encoding.unsupported" || type === "charset.unsupported") {
    res.status(415).json({ error: "Formato de dados não suportado." });
    return;
  }
  req.log.error({ err }, "unhandled request error");
  res.status(500).json({ error: "Algo deu errado do nosso lado. Tente de novo em instantes." });
};
