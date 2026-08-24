import { fileURLToPath } from "url";
import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";

// Apply any pending SQL migrations before accepting traffic.
// Resolve the migrations folder relative to this file (not CWD), so the path
// is correct whether we run from the repo root or from artifacts/api-server/.
// Built output is at  artifacts/api-server/dist/index.mjs
//  → three levels up lands at the repo root  → lib/db/drizzle
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, "../../../lib/db/drizzle");

try {
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations applied");
} catch (err) {
  logger.error({ err }, "Failed to apply database migrations — aborting startup");
  process.exit(1);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
