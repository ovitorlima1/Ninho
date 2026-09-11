# STRUCTURE — Ninho

Árvore (2–3 níveis, sem `node_modules/`, `dist/`, `.git/`).

```
/
├─ package.json              scripts raiz (dev, db:up/down, build, typecheck)
├─ pnpm-workspace.yaml       pacotes + catalog de versões + overrides + minimumReleaseAge
├─ tsconfig.base.json        compilerOptions herdadas por todos os pacotes
├─ tsconfig.json             project references (lib/db, api-client-react, api-zod)
├─ docker-compose.dev.yml    Postgres 16 local na porta 5460
├─ .env.example              DATABASE_URL, SESSION_SECRET, API_PORT, WEB_PORT…
├─ .replit / .replitignore   deploy autoscale, módulos nodejs-24/postgresql-16, postMerge
├─ replit.md                 visão do produto, stack e gotchas (ler primeiro)
├─ .claude/launch.json       preview "ninho-dev" (porta 5180)
├─ .agents/memory/           5 notas de invariantes (auth, sidebar, shell responsivo…)
├─ .specs/                   specs TLC: project/ (PROJECT, STATE, ROADMAP) e codebase/ (este dir)
├─ attached_assets/          PRD, planos e prints colados no chat (não é código)
├─ screenshots/              evidências visuais de mudanças recentes
├─ scripts/
│  ├─ dev-local.sh           sobe Postgres + push schema + API 8787 + Vite 5180
│  ├─ post-merge.sh          install --frozen-lockfile + push do schema (hook Replit)
│  └─ src/hello.ts           placeholder do pacote @workspace/scripts
├─ lib/
│  ├─ db/                    @workspace/db
│  │  ├─ src/index.ts        Pool pg + drizzle(db) + reexport do schema
│  │  ├─ src/schema/         authUsers, profiles, checklistItems, milestones,
│  │  │                      budgetCategories, giftSharing (+ schemas Zod v4)
│  │  ├─ drizzle/            6 migrações SQL + meta/_journal.json e snapshots
│  │  ├─ drizzle.config.ts   drizzle-kit (usa DATABASE_URL)
│  │  └─ baseline.mjs        marca 0000 como aplicada em bancos pré-existentes
│  ├─ api-spec/              openapi.yaml (só /healthz) + orval.config.ts
│  ├─ api-client-react/      custom-fetch.ts (ApiError, credentials: include) + generated/
│  └─ api-zod/               schemas Zod gerados do OpenAPI
└─ artifacts/
   ├─ ninho/                 @workspace/ninho — SPA do produto
   │  ├─ index.html          meta viewport, Google Fonts (Inter), favicon
   │  ├─ vite.config.ts      exige PORT e BASE_PATH; proxy /api; alias @ e @assets
   │  ├─ components.json     config shadcn/ui (style new-york)
   │  ├─ public/             favicon.svg, logo.svg, login-pregnancy.png, images/*.jpg
   │  └─ src/
   │     ├─ main.tsx         createRoot + ErrorBoundary + index.css
   │     ├─ App.tsx          2897 linhas: toda a UI do produto (mapa abaixo)
   │     ├─ index.css        ~1220 linhas: tema shadcn + design system próprio
   │     ├─ lib/api.ts       cliente REST tipado à mão
   │     ├─ lib/recommendations.ts(.test.ts)  catálogo estático + regras de validade
   │     ├─ lib/gestation.ts calcGestationalWeek(dueDate)
   │     ├─ lib/utils.ts     cn() (clsx + tailwind-merge)
   │     ├─ components/error-boundary.tsx     fallback de erro
   │     ├─ components/ui/   55 componentes shadcn (só 4 usados: toast, toaster, tooltip, card)
   │     ├─ hooks/           use-mobile.tsx, use-toast.ts (do template)
   │     └─ pages/not-found.tsx  404 (ainda em inglês, Tailwind puro)
   ├─ api-server/            @workspace/api-server — Express 5
   │  ├─ build.mjs           bundle esbuild ESM + plugin pino
   │  └─ src/
   │     ├─ index.ts         valida PORT e sobe o listener
   │     ├─ app.ts           pino-http, express.json, trust proxy, app.use("/api")
   │     ├─ routes/          index.ts, health.ts, auth.ts, me.ts, gift.ts
   │     ├─ middlewares/requireAuth.ts   valida JWT + sessionVersion
   │     └─ lib/             auth.ts (scrypt/JWT/limitadores) + auth.test.ts,
   │                         seed.ts, email.ts (Resend), logger.ts (pino)
   └─ mockup-sandbox/        canvas de design do Replit (/__mockup), fora do produto
```

## Mapa de `artifacts/ninho/src/App.tsx`

Faixas obtidas de `^function` / `^export default function` até o `}` de coluna 0.

| Linhas | Símbolo | Papel |
|---|---|---|
| 1–90 | imports | React, wouter, lucide, react-query, `@/lib/*` |
| 93–126 | tipos + `adaptItem` | `ChecklistItem` do cliente; converte `price` string→number |
| 128–162 | helpers | `queryClient`, `CATEGORIES`, `money`, `formatDate`, `todayLabel`, `useRecommendationClock` |
| 166–318 | primitivos | `Brand`, `AccountControl`, `TinyButton`, `PasswordField`, `Pill`, `Progress`, `ActionFeedbackBanner`, `LoadingSpinner`, `ErrorState` |
| 322–424 | `OnboardingModal` | captura nome + data prevista no primeiro acesso |
| 428–481 | shell mobile | `Phone` (moldura + tabs), `MobileUtilityLinks` |
| 485–492 | `getNextMilestone` | próximo marco pendente |
| 494–562 | `OverviewPanel` | dashboard (`/dashboard`): progresso, foco da semana, próximo marco, investido |
| 564–701 | `ChecklistPanel` | lista, ciclo de status, remover, vínculo com recomendação |
| 703–813 | `TimelinePanel` | linha do tempo gestacional e marcos |
| 815–895 | `BudgetPanel` | orçamento por categoria (edição + save state) |
| 897–969 | `GiftShareCard` | criar/copiar/revogar link público |
| 970–1145 | `ProfilePanel` | perfil, share, logout, link de feedback |
| 1147–1236 | `RecommendationCard` | cartão de inspiração + link da loja |
| 1238–1324 | `RecommendationLinkModal` | vincular recomendação a item existente |
| 1326–1437 | `RecommendationsPanel` | vitrine (`/recommendations`) |
| 1439–1463 | `AddItemModal` | adicionar item personalizado |
| 1465–1515 | `GiftReservationModal` | reserva do visitante na lista pública |
| 1516–1634 | shell desktop | `DesktopSidebar`, `DesktopSideSummary`, `DesktopWorkspace` |
| **1638–2084** | **`Workspace`** | shell autenticado: queries, 9 mutations, handlers, escolha de layout/painel |
| 2086–2419 | bloco comentado | cópia antiga de `Workspace` (334 linhas mortas — C/A11) |
| 2425–2456 | `getAuthErrorMessage`, `AuthLayout` | mensagem de erro da API; layout das telas de auth |
| 2458–2559 | `AuthPage` | login/cadastro (`/sign-in`, `/sign-up`) |
| 2561–2631 | `PasswordResetRequestPage` | `/forgot-password` |
| 2633–2729 | `PasswordResetPage` | `/reset-password?token=` |
| 2733–2792 | `AuthenticatedApp`, `AppRouter` | resolução de sessão e switch de rotas |
| 2794–2813 | `NinhoApp`, `App` | providers (QueryClient, Tooltip, ErrorBoundary, Toaster) e `WouterRouter` |
| 2815–2897 | `PublicGiftPage` | lista pública `/gift/:token` |
