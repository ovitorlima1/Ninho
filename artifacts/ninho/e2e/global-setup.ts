import { execFileSync } from "node:child_process";
import { Client, repoRoot, withTestDb } from "./db";
import { assertTestDatabase, E2E_DATABASE_URL } from "./env";

/** Cria o banco de teste se faltar, aplica o schema atual e zera os limites. */
export default async function globalSetup(): Promise<void> {
  const target = assertTestDatabase(E2E_DATABASE_URL);
  const databaseName = target.pathname.replace(/^\//, "");

  const admin = new URL(target);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (!rowCount) {
      // Nome já validado por assertTestDatabase; identificador entre aspas.
      await client.query(`CREATE DATABASE "${databaseName.replaceAll('"', "")}"`);
    }
  } finally {
    await client.end();
  }

  execFileSync("pnpm", ["--filter", "@workspace/db", "run", "push-force"], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "pipe",
  });

  // Os limites de tentativa ficam no banco e sobreviveriam entre execuções.
  await withTestDb((db) => db.query("TRUNCATE auth_attempts"));
}
