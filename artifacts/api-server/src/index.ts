import app from "./app";
import { backfillLegacyChecklists } from "./lib/checklist-store";
import { logger } from "./lib/logger";

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

// Contas de antes das listas são migradas antes de a API atender (LC-R26). Se a varredura
// falhar, a API sobe assim mesmo: o GET /workspace migra a conta no primeiro acesso.
try {
  const migrated = await backfillLegacyChecklists();
  if (migrated > 0) logger.info({ migrated }, "Legacy checklists migrated");
} catch (err) {
  logger.error({ err }, "Legacy checklist backfill error");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
