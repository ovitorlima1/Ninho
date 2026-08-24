import crypto from 'crypto';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Compute hash exactly as drizzle-orm does
const sqlPath = path.join(__dirname, 'drizzle/0000_init_schema.sql');
const query = readFileSync(sqlPath, 'utf8').replace(/\r\n/g, '\n');
const hash = crypto.createHash('sha256').update(query).digest('hex');
console.log('Computed hash:', hash);

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Drizzle's pg migrator stores migration history in the "drizzle" schema
// (not "public"). Replicate the exact table it creates.
await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
`);

// Drizzle applies a migration only when:
//   !lastRecord || lastRecord.created_at < migration.folderMillis
// The migration's folderMillis = 1787340509504. Inserting a record with
// created_at >= that value makes Drizzle skip the already-applied migration.
const existing = await pool.query('SELECT id FROM drizzle.__drizzle_migrations WHERE hash = $1', [hash]);
if (existing.rows.length > 0) {
  console.log('Already baselined — nothing to do.');
} else {
  await pool.query(
    'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
    [hash, 1787340509504]
  );
  console.log('Baseline record inserted. Drizzle migrate() will now skip migration 0000.');
}

await pool.end();
