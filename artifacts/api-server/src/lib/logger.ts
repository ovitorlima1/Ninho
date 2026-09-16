import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

type SerializedError = ReturnType<typeof pino.stdSerializers.err> & Record<string, unknown>;

function withoutText(value: unknown, text: string): unknown {
  return typeof value === "string" ? value.split(text).join("\nparams: [Redacted]") : value;
}

/**
 * Erros de consulta do Drizzle trazem os valores (e-mail, anotações pessoais)
 * nos campos `params` e dentro da própria mensagem e do stack. Aqui o trecho
 * exato sai dos dois antes de o erro ir para o log.
 */
export function errSerializer(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  const serialized = pino.stdSerializers.err(err) as SerializedError;
  const params = (err as { params?: unknown }).params;
  if (params !== undefined) {
    const leaked = `\nparams: ${String(params)}`;
    serialized.message = withoutText(serialized.message, leaked) as string;
    serialized.stack = withoutText(serialized.stack, leaked) as string;
    delete serialized.params;
  }
  if ("detail" in serialized) serialized.detail = "[Redacted]";
  return serialized;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: { err: errSerializer },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    "err.params",
    "err.detail",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
