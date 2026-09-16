# INTEGRATIONS — Ninho

Serviços externos e superfícies de integração. Nenhuma chave de API vive no
repositório: o que existe é `.env.example` (sem valores) e o `.env` local (ignorado).

## 1. Google Fonts (duas cargas distintas)

- `artifacts/ninho/index.html:17-19`: `preconnect` + `<link>` para
  `fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700` — **Inter não é
  usada em lugar nenhum do CSS** (ver CONCERNS).
- `artifacts/ninho/src/index.css:2`: `@import url(".../css2?family=Montserrat:wght@400..800&family=Space+Mono...")`
  — essas sim alimentam `--app-font-sans` (Montserrat) e `--app-font-mono` (Space Mono).
- Efeito: dependência de terceiro em tempo de render, com uma requisição
  desnecessária e uma cadeia bloqueante (`@import` dentro do CSS já bloqueante).

## 2. Resend via Replit Connectors (e-mail transacional)

- `artifacts/api-server/src/lib/email.ts`: `new ReplitConnectors()` e
  `connectors.proxy("resend", "/emails", { method: "POST", … })` — o token do
  Resend nunca aparece no código; o proxy do Replit o injeta.
- Único uso: link de redefinição de senha
  (`routes/auth.ts:223`, disparado em *fire-and-forget* com `.catch` logado).
- Requisitos: `RESEND_FROM_EMAIL` (remetente verificado; ausência → erro) e
  `PUBLIC_APP_URL` HTTPS canônica (`getPublicAppUrl`, `routes/auth.ts:74`);
  fora de produção aceita `https://$REPLIT_DEV_DOMAIN`.
- O SDK (`@replit/connectors-sdk@0.4.1`, dependência da **raiz**, não do
  api-server) lê `REPL_IDENTITY`, `WEB_REPL_RENEWAL`, `REPLIT_CONNECTORS_HOSTNAME`,
  `REPLIT_CONNECTORS_AUDIENCE`, `CONNECTORS_HOST` — só existem dentro do Replit.
- **Localmente o reset de senha não envia e-mail** (documentado em `.env.example`);
  a rota continua respondendo 202 com a mensagem genérica.

## 3. Amazon (links de afiliado ainda não; só busca)

- `artifacts/ninho/src/lib/recommendations.ts:27`:
  `searchLink(q) = https://www.amazon.com.br/s?k=${encodeURIComponent(q)}`.
  Os 8 itens do catálogo apontam para páginas de **busca**, não para produtos;
  `price: null` em todos ("Preço a confirmar").
- Só há saída de link, nenhuma API: sem chave, sem tracking, sem preço em tempo real.
- Proteção: `isSafeStoreUrl()` exige `https:`; o `<a>` usa
  `target="_blank" rel="noopener noreferrer"` e revalida a expiração no clique
  (`App.tsx:1217-1225`).

## 4. Google Forms (feedback do beta)

- `artifacts/ninho/src/App.tsx:1138`: link fixo `https://forms.gle/ninho-feedback`
  no perfil ("deixar feedback do beta"). Slug aparentemente placeholder — vale
  confirmar se a URL existe.

## 5. Replit (hospedagem, deploy e ferramentas de dev)

- `.replit`: `modules = ["nodejs-24", "python-base-3.13", "postgresql-16"]`,
  `deploymentTarget = "autoscale"`, `router = "application"`,
  `postBuild: pnpm store prune`, `postMerge: scripts/post-merge.sh`
  (install + `drizzle-kit push`).
- `artifacts/ninho/.replit-artifact/artifact.toml`: serviço web em `localPort 18444`,
  produção **estática** (`publicDir artifacts/ninho/dist/public`) com rewrite
  `/* → /index.html`; env `PORT=18444`, `BASE_PATH=/`.
- `artifacts/api-server/.replit-artifact/artifact.toml`: serviço `api` em
  `localPort 8080`, paths `/api`, health de startup em `/api/healthz`,
  produção roda `node --enable-source-maps artifacts/api-server/dist/index.mjs`.
- `artifacts/mockup-sandbox/.replit-artifact/artifact.toml`: canvas de design em
  `/__mockup`, porta 8081 (só desenvolvimento).
- Plugins Vite da Replit (`artifacts/ninho/vite.config.ts`):
  `@replit/vite-plugin-runtime-error-modal` sempre; `cartographer` e `dev-banner`
  apenas quando `NODE_ENV !== "production"` **e** `REPL_ID` está definido.
- Produção: `https://ninho-mother.replit.app` (citada em `replit.md`).
- `pnpm-workspace.yaml` aplica `minimumReleaseAge: 1440` (defesa de supply chain),
  com exceção para `@replit/*` e `stripe-replit-sync`.

## 6. PostgreSQL

- Produção: banco gerenciado pelo Replit (`postgresql-16`), acessado por
  `DATABASE_URL` (`lib/db/src/index.ts`, pool `pg`).
- Local: container `postgres:16-alpine` do `docker-compose.dev.yml`
  (host **5460** → 5432, credenciais `ninho/ninho/ninho`, volume `ninho-pgdata`).
- Schema aplicado por `drizzle-kit push` (`pnpm --filter @workspace/db run push-force`);
  há também 6 migrações versionadas em `lib/db/drizzle/` e `baseline.mjs` para
  bancos que já tinham as tabelas.

## Variáveis de ambiente (todas as lidas em código)

| Variável | Onde é lida | Obrigatória |
|---|---|---|
| `DATABASE_URL` | `lib/db/src/index.ts`, `lib/db/drizzle.config.ts` | sim (lança se faltar) |
| `SESSION_SECRET` | `api-server/src/lib/auth.ts:165` | sim, ≥32 chars |
| `PORT` | `api-server/src/index.ts`, `ninho/vite.config.ts` | sim nos dois |
| `BASE_PATH` | `ninho/vite.config.ts` | sim (build e dev) |
| `API_PROXY_TARGET` | `ninho/vite.config.ts` | só dev fora do Replit |
| `NODE_ENV` | `logger.ts`, `auth.ts` (cookie `Secure`), `vite.config.ts` | recomendada |
| `LOG_LEVEL` | `api-server/src/lib/logger.ts` (default `info`) | não |
| `PUBLIC_APP_URL` | `routes/auth.ts:75` (link de reset) | sim em produção |
| `RESEND_FROM_EMAIL` | `lib/email.ts:14` | sim para enviar e-mail |
| `REPLIT_DEV_DOMAIN` | `routes/auth.ts:76` (fallback fora de produção) | injetada pelo Replit |
| `REPL_ID` | `ninho/vite.config.ts` (plugins de dev) | injetada pelo Replit |
| `REPL_IDENTITY`, `WEB_REPL_RENEWAL`, `REPLIT_CONNECTORS_*`, `CONNECTORS_HOST` | `@replit/connectors-sdk` | injetadas pelo Replit |
| `API_PORT`, `WEB_PORT` | `scripts/dev-local.sh` (8787 / 5180) | só local |
