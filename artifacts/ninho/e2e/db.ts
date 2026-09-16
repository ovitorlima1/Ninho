import { createRequire } from "node:module";
import path from "node:path";
import { assertTestDatabase, E2E_DATABASE_URL } from "./env";

export const repoRoot = path.resolve(import.meta.dirname, "../../..");

// `pg` é dependência do pacote de banco; é de lá que ele é resolvido.
const requireFromDb = createRequire(path.join(repoRoot, "lib/db/package.json"));
export type PgClient = {
  connect(): Promise<void>;
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rowCount: number | null; rows: Row[] }>;
  end(): Promise<void>;
};
export const { Client } = requireFromDb("pg") as { Client: new (config: { connectionString: string }) => PgClient };

/** Roda uma função com um cliente do banco de teste (nunca o de dev). */
export async function withTestDb<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
  assertTestDatabase(E2E_DATABASE_URL);
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
