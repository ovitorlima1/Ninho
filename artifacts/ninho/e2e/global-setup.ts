import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { assertTestDatabase, E2E_DATABASE_URL } from "./env";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

// `pg` é dependência do pacote de banco; é de lá que ele é resolvido.
const requireFromDb = createRequire(path.join(repoRoot, "lib/db/package.json"));
type PgClient = {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rowCount: number | null }>;
  end(): Promise<void>;
};
const { Client } = requireFromDb("pg") as { Client: new (config: { connectionString: string }) => PgClient };

/** Cria o banco de teste se faltar e aplica o schema atual. */
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
}
