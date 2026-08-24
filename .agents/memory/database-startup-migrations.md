---
name: Database startup migrations
description: Schema changes must not run inside the API process startup.
---

Do not run Drizzle migrations when the API server starts. Apply schema changes through Replit's managed database flow instead. When a SQL migration is committed, include its Drizzle journal entry and generated snapshot; SQL files alone are not recognized by the migrator.

**Why:** A database can already contain the application tables while its Drizzle migration ledger is incomplete. Retrying schema DDL on every API boot can then prevent the server—and the Clerk proxy it serves—from starting at all.

**How to apply:** Keep API startup limited to serving traffic. Generate migrations from the existing Drizzle history, commit the SQL plus `meta/_journal.json` and the new snapshot, then use the development schema-application flow after merges and the Publish flow for production schema changes.