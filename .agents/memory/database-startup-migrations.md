---
name: Database startup migrations
description: Schema changes must not run inside the API process startup.
---

Do not run Drizzle migrations when the API server starts. Apply schema changes through Replit's managed database flow instead.

**Why:** A database can already contain the application tables while its Drizzle migration ledger is incomplete. Retrying schema DDL on every API boot can then prevent the server—and the Clerk proxy it serves—from starting at all.

**How to apply:** Keep API startup limited to serving traffic. Use the development schema-application flow after merges and the Publish flow for production schema changes.