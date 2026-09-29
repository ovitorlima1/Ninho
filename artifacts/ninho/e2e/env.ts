import os from "node:os";
import path from "node:path";
/**
 * Banco e segredo do E2E. O padrão aponta para o Postgres do
 * docker-compose.dev.yml, num banco separado (`ninho_test`).
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://ninho:ninho@localhost:5460/ninho_test";

export const E2E_SESSION_SECRET =
  process.env.E2E_SESSION_SECRET ?? "e2e-session-secret-only-for-local-tests-0123456789";

/**
 * Pasta onde a API de teste grava os e-mails (EMAIL_TRANSPORT=outbox). É
 * daqui que o E2E tira o link de confirmação, como a pessoa faria na caixa de entrada.
 */
export const E2E_OUTBOX_DIR = process.env.E2E_OUTBOX_DIR ?? path.join(os.tmpdir(), "ninho-e2e-outbox");

/** Trava de segurança: o E2E cria contas e nunca deve rodar no banco de dev. */
export function assertTestDatabase(url: string): URL {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`E2E_DATABASE_URL precisa apontar para um banco *_test (recebido: "${name}").`);
  }
  return parsed;
}
