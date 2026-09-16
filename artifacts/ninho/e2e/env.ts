/**
 * Banco e segredo do E2E. O padrão aponta para o Postgres do
 * docker-compose.dev.yml, num banco separado (`ninho_test`).
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://ninho:ninho@localhost:5460/ninho_test";

export const E2E_SESSION_SECRET =
  process.env.E2E_SESSION_SECRET ?? "e2e-session-secret-only-for-local-tests-0123456789";

/** Trava de segurança: o E2E cria contas e nunca deve rodar no banco de dev. */
export function assertTestDatabase(url: string): URL {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`E2E_DATABASE_URL precisa apontar para um banco *_test (recebido: "${name}").`);
  }
  return parsed;
}
