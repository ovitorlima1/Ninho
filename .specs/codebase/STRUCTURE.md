# STRUCTURE — Ninho

Estado depois da Fase 3 (branch `fase-0-correcoes-urgentes`, até `0c7ca8d`).
Árvore sem `node_modules/`, `dist/`, `.git/`. Números = linhas (`wc -l`).

```
/
├─ package.json              scripts raiz: dev, db:up/down, build, typecheck, lint, test, test:e2e
├─ pnpm-workspace.yaml       pacotes + catalog de versões + overrides + minimumReleaseAge
├─ eslint.config.mjs         ESLint flat config (typescript-eslint; react-hooks e jsx-a11y no front)
├─ tsconfig.base.json        compilerOptions herdadas por todos os pacotes
├─ tsconfig.json             project references (lib/db, api-client-react, api-zod)
├─ docker-compose.dev.yml    Postgres 16 local na porta 5460 (dev: ninho; E2E: ninho_test)
├─ .env.example              DATABASE_URL, SESSION_SECRET, API_PORT=8787, WEB_PORT…
├─ .github/workflows/ci.yml  CI: jobs checks (typecheck, lint, test, build) e e2e (Postgres de serviço)
├─ .replit / .replitignore   deploy autoscale, módulos nodejs-24/postgresql-16, postMerge
├─ replit.md                 visão do produto, stack e gotchas (ler primeiro)
├─ .claude/launch.json       preview "ninho-dev" (porta 5180)
├─ .agents/memory/           notas de invariantes (auth, casca responsiva, migrações…)
├─ .specs/                   TLC: project/ (PROJECT, STATE, ROADMAP), codebase/ (este dir), features/fase-0…fase-3
├─ attached_assets/          PRD, planos e prints colados no chat (não é código)
├─ screenshots/              evidências visuais
├─ scripts/
│  ├─ dev-local.sh           sobe Postgres + push do schema + API 8787 + Vite 5180
│  ├─ post-merge.sh          install --frozen-lockfile + push do schema (hook Replit)
│  └─ src/hello.ts           placeholder do pacote @workspace/scripts
├─ lib/
│  ├─ db/                    @workspace/db
│  │  ├─ src/index.ts        Pool pg + drizzle(db) + reexport do schema (lança sem DATABASE_URL)
│  │  ├─ src/schema/         authUsers, profiles, checklistItems (+ RECOMMENDATION_IDS),
│  │  │                      milestones, budgetCategories (+ upsertBudgetSchema), giftSharing
│  │  ├─ drizzle/            6 migrações SQL (0000–0005) + meta/
│  │  ├─ drizzle.config.ts   drizzle-kit (usa DATABASE_URL)
│  │  ├─ package.json        scripts push e push-force (este usado pelo globalSetup do E2E)
│  │  └─ baseline.mjs        marca 0000 como aplicada em bancos pré-existentes
│  ├─ api-spec/              openapi.yaml (só /healthz) + orval.config.ts
│  ├─ api-client-react/      custom-fetch.ts (ApiError, credentials: include) + generated/ (hooks sem uso)
│  └─ api-zod/               schemas Zod gerados do OpenAPI
└─ artifacts/
   ├─ ninho/                 @workspace/ninho — SPA do produto (detalhe abaixo)
   ├─ api-server/            @workspace/api-server — Express 5 (detalhe abaixo)
   └─ mockup-sandbox/        canvas de design do Replit (/__mockup), fora do produto e do lint
```

## `artifacts/ninho`

```
artifacts/ninho/
├─ index.html              lang="pt-BR", viewport sem trava de zoom, Montserrat + Space Mono (Google Fonts), color-scheme light
├─ vite.config.ts          exige PORT e BASE_PATH; alias @ e @assets; proxy /api se API_PROXY_TARGET
├─ vitest.config.ts        Vitest em node, src/**/*.test.ts, alias @
├─ playwright.config.ts    E2E: API 8790 + Vite 5190 (ou `E2E_API_PORT`/`E2E_WEB_PORT`), projetos celular/desktop
├─ tsconfig.json           strict; inclui src, e2e e as duas configs de teste
├─ public/                 favicon.svg, logo.svg, robots.txt, images/login-gestante.jpg (foto do login, Pexels)
├─ e2e/                    ver TESTING.md
│  ├─ env.ts                    19  E2E_DATABASE_URL, E2E_SESSION_SECRET, trava *_test
│  ├─ global-setup.ts           41  cria ninho_test e roda push-force
│  ├─ support.ts                70  createAccount (XFF único), itemRow, expectAccessible (axe)
│  ├─ auth.spec.ts              73  3 cenários
│  ├─ checklist.spec.ts        104  8 cenários
│  └─ workspace.spec.ts         89  6 cenários
└─ src/
   ├─ main.tsx                  17  createRoot + ErrorBoundary + index.css
   ├─ App.tsx                   24  WouterRouter(base) + QueryClientProvider + ErrorBoundary + AppRouter
   ├─ index.css                 14  @layer + tailwind + import das quatro camadas de estilo
   ├─ app/
   │  ├─ query-client.ts        26  QueryClient; 401 em query/mutation limpa o cache e leva ao login
   │  └─ router.tsx             83  AppRouter/AuthenticatedApp; React.lazy por área (acesso, workspace, página pública)
   ├─ components/               peças reutilizáveis, sem regra de negócio
   │  ├─ action-feedback.tsx    32  ActionFeedbackBanner + tipos ActionFeedback/RecommendationFeedback
   │  ├─ brand.tsx              13  logotipo
   │  ├─ category-icon.tsx      15  ícone lucide por categoria (usado nas inspirações)
   │  ├─ controls.tsx            9  TinyButton (botão de ícone), Pill
   │  ├─ draft-number-input.tsx 49  campo numérico com rascunho de texto; parseQtyInput
   │  ├─ error-boundary.tsx     98  ErrorBoundary com fallback em pt-BR
   │  ├─ modal-shell.tsx       148  ModalShell (dialog, foco preso, Esc, devolve foco) + ConfirmDialog
   │  ├─ password-field.tsx     70  senha com mostrar/ocultar
   │  ├─ progress.tsx           27  Progress (fita métrica)
   │  └─ states.tsx             17  LoadingSpinner, ErrorState
   ├─ layout/
   │  └─ app-shell.tsx         158  NAV_ITEMS (5 destinos), navPathFor, NavLinks, AppShell, ListScreen (abas Itens/Inspirações)
   ├─ features/
   │  ├─ auth/
   │  │  ├─ auth-layout.tsx           25  moldura das telas de acesso
   │  │  ├─ auth-page.tsx            148  login e cadastro (/sign-in, /sign-up), erro por campo
   │  │  └─ password-reset-pages.tsx 175  /forgot-password e /reset-password?token=
   │  ├─ onboarding/onboarding-modal.tsx 134  nome + data prevista (2 passos)
   │  ├─ overview/overview-panel.tsx     136  Início: semana, preparo, próximo marco, orçamento
   │  ├─ checklist/
   │  │  ├─ checklist-panel.tsx      169  lista com status em radiogroup, remover/desfazer, vínculo com inspiração
   │  │  └─ item-modals.tsx          161  ItemFields, AddItemModal, EditItemModal
   │  ├─ timeline/
   │  │  ├─ timeline-panel.tsx       107  Marcos (atrasado com data real)
   │  │  └─ arrival-notice.tsx        19  aviso "o bebê nasceu?" após a data prevista
   │  ├─ budget/budget-panel.tsx          99  planejado × gasto por categoria
   │  ├─ profile/
   │  │  ├─ profile-panel.tsx        187  perfil sempre editável, lista de presentes, sair
   │  │  └─ gift-share-card.tsx       98  criar/copiar/gerar novo/revogar link público
   │  ├─ recommendations/
   │  │  ├─ recommendations-panel.tsx      126  vitrine de inspirações
   │  │  ├─ recommendation-card.tsx         93  card com ícone da categoria (sem foto)
   │  │  ├─ recommendation-link-modal.tsx   57  vincular inspiração a item existente
   │  │  └─ use-recommendation-clock.ts     16  relógio que re-renderiza na expiração (≤ 1 h)
   │  ├─ gift/
   │  │  ├─ public-gift-page.tsx      92  /gift/:token (chunk próprio)
   │  │  └─ gift-reservation-modal.tsx 64  reserva do visitante
   │  └─ workspace/
   │     ├─ workspace-page.tsx       135  composição das telas logadas por rota
   │     └─ use-workspace.ts         446  query do workspace + mutations (setQueryData; invalida só em erro) + handlers
   ├─ lib/                      TS puro, testável (nenhum arquivo importa React)
   │  ├─ api.ts                284  cliente REST tipado à mão sobre customFetch
   │  ├─ budget.ts              51  calcSpentCents/calcSpent/calcSpentByCategory (+ budget.test.ts, 68)
   │  ├─ gestation.ts          102  calcGestation, semana/dias, limites da data prevista (+ gestation.test.ts, 78)
   │  ├─ recommendations.ts    216  catálogo estático (vence 2026-12-10) + regras de validade (+ recommendations.test.ts, 91)
   │  ├─ items.ts               64  ChecklistItem, adaptItem, CATEGORIES, opções de status, preço
   │  ├─ milestones.ts          12  getNextMilestone
   │  ├─ format.ts              20  basePath, money, formatDate, todayLabel, initialsFor
   │  └─ errors.ts              35  isUnauthorized, getFriendlyErrorMessage (= getAuthErrorMessage)
   ├─ styles/                   camadas da Fase 2 (A10)
   │  ├─ tokens.css            121  única fonte de cor, tipo, espaço, raio, sombra, movimento
   │  ├─ base.css               84  reset, tipografia, foco, movimento reduzido
   │  ├─ components.css       1387  um bloco por componente
   │  └─ layout.css            196  casca (barra inferior/lateral) e pontos de quebra
   └─ pages/not-found.tsx       24  404 em pt-BR
```

Total: 52 arquivos em `src/` (~6.100 linhas) + 6 em `e2e/` (396). Maior arquivo TS: `use-workspace.ts` (446,
é hook, não componente); maior componente: `profile-panel.tsx` (187).

**Removidos na Fase 3** (`85e1a8e`): `src/components/ui/` (55 componentes shadcn), `src/hooks/`
(`use-mobile`, `use-toast`), `src/lib/utils.ts` (`cn`), `public/images/*.jpg`, `components.json`,
além de `Toaster`/`TooltipProvider` e das dependências sem import. O `App.tsx` de 2.897 linhas
foi dividido em `be5699d`.

### Regras de camada (`.specs/features/fase-3-base-tecnica/design.md` §1)

- `lib/` não importa React (conferido: nenhum `from "react"` em `src/lib`).
- `components/` e `layout/` não importam `features/`.
- Uma feature não importa outra, exceto o que é exportado de propósito. Exceções atuais:
  `workspace/workspace-page.tsx` compõe todos os painéis; `overview/overview-panel.tsx` usa
  `timeline/arrival-notice.tsx`.
- `App.tsx` fica só com providers e router (≤ 80 linhas); componente ≤ ~400 linhas.
- Estilo é CSS global por classe (sem CSS Modules); cores só via tokens de `styles/tokens.css`.

## `artifacts/api-server`

```
artifacts/api-server/
├─ build.mjs               bundle esbuild ESM + plugin pino
├─ vitest.config.ts        Vitest em node, src/**/*.test.ts
└─ src/
   ├─ index.ts              25  valida PORT e sobe o listener
   ├─ app.ts                36  trust proxy loopback, pino-http, express.json + urlencoded, /api
   ├─ routes/
   │  ├─ index.ts           14  monta health, /auth, /me e /gift
   │  ├─ health.ts          11  GET /healthz
   │  ├─ auth.ts           352  register (chama initializeUser), login, session, password-reset/request|complete, logout
   │  ├─ me.ts             388  workspace (ensureUserInitialized), share, gift-reservations, profile, checklist, milestones, budget
   │  └─ gift.ts           144  GET /:token e POST /:token/reservations (público)
   ├─ middlewares/requireAuth.ts  34  valida JWT + sessionVersion
   └─ lib/
      ├─ auth.ts           310  scrypt, JWT (7 dias), cookie, AuthAttemptLimiter (em memória) e limitadores
      ├─ auth.test.ts       99  5 testes dos limitadores de reset
      ├─ seed.ts           105  initializeUser (cadastro) e ensureUserInitialized (só SELECT se já há perfil)
      ├─ email.ts           49  e-mail de recuperação via Resend
      └─ logger.ts          20  pino com redact
```

Seed: desde `dc934a4` o workspace padrão nasce no `POST /api/auth/register`
(`routes/auth.ts:153`). `GET /api/me/workspace` (`routes/me.ts:41`) e `PUT /api/me/profile`
(`routes/me.ts:179`) chamam `ensureUserInitialized`, que só grava para contas antigas sem perfil.
