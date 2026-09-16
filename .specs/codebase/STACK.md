# STACK — Ninho

Monorepo pnpm (`pnpm-workspace.yaml`): `artifacts/*`, `lib/*`, `scripts`.
Fonte de contexto complementar: `replit.md` (raiz).

## Runtime e linguagem

| Item | Versão | Onde |
|---|---|---|
| Node.js | 24 no Replit (`.replit`: `modules = ["nodejs-24"]`); 26.3 na máquina local | `.replit` |
| pnpm | 11.x (`allowBuilds` em `pnpm-workspace.yaml`) | raiz |
| TypeScript | `~5.9.3` (resolvido 5.9.3) | `package.json` (raiz) |
| PostgreSQL | 16 (`postgres:16-alpine` local, `postgresql-16` no Replit) | `docker-compose.dev.yml`, `.replit` |
| Prettier | `^3.9.6` instalado, **sem** arquivo de configuração e sem script | `package.json` |

`tsconfig.base.json` (raiz) é herdado por todos os pacotes: `target/lib es2022`,
`module esnext`, `moduleResolution bundler`, `isolatedModules`, `strictNullChecks`,
`noImplicitAny`, `noImplicitReturns`, `skipLibCheck`, `customConditions: ["workspace"]`.
Não usa `strict: true` — `strictFunctionTypes` e `noUnusedLocals` estão `false`.

## Pacotes do workspace

| Pacote | Caminho | Papel |
|---|---|---|
| `@workspace/ninho` | `artifacts/ninho` | SPA React (produto) |
| `@workspace/api-server` | `artifacts/api-server` | API Express 5 (`/api`) |
| `@workspace/db` | `lib/db` | Drizzle ORM + schemas + pool `pg` |
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI (`openapi.yaml`) + Orval |
| `@workspace/api-client-react` | `lib/api-client-react` | `customFetch` + hooks gerados |
| `@workspace/api-zod` | `lib/api-zod` | schemas Zod gerados do OpenAPI |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | canvas de mockups do Replit (`/__mockup`), fora do produto |
| `@workspace/scripts` | `scripts` | placeholder (`src/hello.ts`) + `dev-local.sh`, `post-merge.sh` |

## Bibliotecas principais (versões resolvidas)

Frontend (`artifacts/ninho/package.json`, muitas via `catalog:`):
React 19.1.4 · react-dom 19.1.4 · Vite 7.3.6 · Tailwind CSS 4.3.3 (`@tailwindcss/vite`,
sem `tailwind.config`) · `@tanstack/react-query` 5.101.4 · wouter 3.10.0 ·
lucide-react 0.545.0 · `@vitejs/plugin-react` 5.2.0 · plugins Replit
(`vite-plugin-runtime-error-modal`, `cartographer`, `dev-banner`) ·
~30 pacotes Radix + shadcn/ui (`src/components/ui`, 55 arquivos, ver CONCERNS).

Backend (`artifacts/api-server/package.json`): Express 5.2.1 · pino 9.14.0 +
pino-http 10.5.0 · drizzle-orm 0.45.2 · esbuild 0.27.3 (bundle CJS→ESM via
`build.mjs`, plugin `esbuild-plugin-pino`) · tsx 4.23.1 (watch).

Dados (`lib/db`): drizzle-orm 0.45.2 · drizzle-kit 0.31.10 · drizzle-zod 0.8.3 ·
pg 8.22.0 · zod 3.25.76 (importado **sempre** como `zod/v4`).

Codegen (`lib/api-spec`): orval 8.23.0 → `pnpm --filter @workspace/api-spec run codegen`.

Integração: `@replit/connectors-sdk` 0.4.1 (dependência da **raiz**, usada em
`artifacts/api-server/src/lib/email.ts`).

## Build

- Frontend: `vite build` → `artifacts/ninho/dist/public` (exige `PORT` e `BASE_PATH`,
  ver `artifacts/ninho/vite.config.ts`, que lança erro se faltarem).
- API: `node ./build.mjs` (esbuild, saída `dist/index.mjs`, sourcemaps).
- Raiz: `pnpm run build` = `typecheck` + `build` recursivo.
- Typecheck: `pnpm run typecheck` = `tsc --build` (libs, project references) +
  `tsc --noEmit` em `artifacts/**` e `scripts`.

## Rodar localmente

1. `cp .env.example .env` e preencher `SESSION_SECRET` (≥32 chars, `openssl rand -hex 32`).
2. `pnpm install`
3. `pnpm dev` → executa `scripts/dev-local.sh`, que:
   - sobe o Postgres (`pnpm db:up` / `docker-compose.dev.yml`, **porta 5460**→5432,
     usuário/senha/base `ninho`);
   - aplica o schema com `pnpm --filter @workspace/db run push-force`;
   - sobe a API em `PORT=8787` (`dev:watch`, tsx watch);
   - sobe o Vite em `PORT=5180` com `BASE_PATH=/` e
     `API_PROXY_TARGET=http://localhost:8787` (proxy de `/api`).
4. App em `http://localhost:5180`; healthcheck em `http://localhost:8787/api/healthz`.
5. `pnpm db:down` derruba o banco (volume `ninho-pgdata` é preservado).

Variáveis de `.env.example`: `DATABASE_URL`, `SESSION_SECRET`, `API_PORT=8787`,
`WEB_PORT=5180`, `LOG_LEVEL`, e (comentadas) `PUBLIC_APP_URL`, `RESEND_FROM_EMAIL`.
`.claude/launch.json` define o preview `ninho-dev` (porta 5180).

No Replit as portas são outras (API 8080, web 18444 servida como estático) —
ver `artifacts/*/.replit-artifact/artifact.toml` e INTEGRATIONS.md.
