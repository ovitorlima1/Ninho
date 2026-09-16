# Fase 3 — Design

## 1. Estrutura de módulos do front (A11)

```
src/
├── App.tsx                     # só providers + router (≤ 80 linhas)
├── main.tsx
├── app/
│   ├── query-client.ts         # QueryClient + tratamento de 401
│   └── router.tsx              # AppRouter com React.lazy por rota
├── components/                 # peças reutilizáveis, sem regra de negócio
│   ├── brand.tsx
│   ├── progress.tsx            # fita métrica
│   ├── modal-shell.tsx         # ModalShell + ConfirmDialog
│   ├── action-feedback.tsx     # ActionFeedbackBanner + tipos
│   ├── controls.tsx            # IconButton (TinyButton), Pill
│   ├── password-field.tsx
│   ├── states.tsx              # LoadingSpinner, ErrorState
│   └── error-boundary.tsx      # (já existe)
├── layout/
│   └── app-shell.tsx           # NAV_ITEMS, NavLinks, AppShell, ListScreen
├── features/
│   ├── auth/                   # AuthLayout, AuthPage, recuperação e redefinição de senha
│   ├── onboarding/             # OnboardingModal
│   ├── overview/               # OverviewPanel
│   ├── checklist/              # ChecklistPanel, ItemFields, Add/EditItemModal
│   ├── timeline/               # TimelinePanel, ArrivalNotice
│   ├── budget/                 # BudgetPanel
│   ├── profile/                # ProfilePanel, GiftShareCard
│   ├── recommendations/        # painel, card, modal de vínculo, relógio do catálogo
│   ├── gift/                   # PublicGiftPage, GiftReservationModal
│   └── workspace/
│       ├── workspace-page.tsx  # composição das telas logadas
│       └── use-workspace.ts    # query + mutations + handlers
├── lib/                        # puro, testável
│   ├── api.ts  budget.ts  gestation.ts  recommendations.ts   (já existem)
│   ├── items.ts                # ChecklistItem, adaptItem, CATEGORIES, describeItemTotal, preço
│   ├── milestones.ts           # getNextMilestone
│   ├── format.ts               # money, formatDate, todayLabel, initialsFor
│   └── errors.ts               # getFriendlyErrorMessage, isUnauthorized
└── pages/not-found.tsx
```

Regras: `lib/` não importa React; `components/` não importa `features/`; features não
importam umas das outras, exceto pelo que é exportado de propósito (ex.: `AddItemModal`
usado pela workspace).

## 2. Testes

| Camada | Ferramenta | Onde | O que cobre |
|---|---|---|---|
| Unitário front | Vitest (ambiente node) | `artifacts/ninho/src/**/*.test.ts` | regras puras de `lib/` |
| Unitário API | Vitest | `artifacts/api-server/src/**/*.test.ts` | limitadores, validações |
| E2E | Playwright (Chromium) + `@axe-core/playwright` | `artifacts/ninho/e2e/` | fluxos reais em 375 e 1280px |

**Banco do E2E:** `ninho_test` no mesmo Postgres do `docker-compose.dev.yml` (porta 5460).
O `globalSetup` cria o banco se não existir e roda `drizzle-kit push --force` com
`DATABASE_URL` apontando para ele. Cada teste cria uma conta nova com e-mail único, então os
testes não dependem de ordem nem de limpeza.

**Servidores do E2E:** `webServer` do Playwright sobe a API (porta 8790) e o Vite (5190) com
`DATABASE_URL` de teste — portas diferentes das de dev, para não brigar com `pnpm dev`.
`reuseExistingServer` fica desligado no CI.

**Sessão expirada no E2E:** apagar o cookie de sessão do contexto do navegador e agir.

**Recuperação de senha no E2E:** o limitador é por processo; o teste usa um e-mail único e
faz 4 pedidos. O envio de e-mail falha sem as credenciais do Resend, mas a rota responde 202
de qualquer forma (comportamento atual).

## 3. Cache do workspace (M9)

- `updateItem`, `addItem`, `deleteItem`, `toggleMilestone`, `updateProfile`, `updateBudget`:
  - `onMutate` continua otimista (onde já é);
  - `onSuccess` grava a resposta da API no cache (`setQueryData`);
  - `onError` restaura o estado anterior **e** invalida o workspace para ressincronizar;
  - sai o `onSettled: invalidateQueries`.
- `staleTime` do workspace sobe para 5 minutos; `refetchOnWindowFocus` continua ligado (volta
  do app depois de um tempo traz dados de outro dispositivo).

**API:** `POST /api/auth/register` chama `initializeUser` na mesma requisição.
`GET /api/me/workspace` faz `SELECT` no perfil primeiro e só chama `initializeUser` se não
houver perfil (contas antigas).

## 4. Bundle (M8)

- Remover de `artifacts/ninho/package.json` o que não é importado por nenhum arquivo de
  `src/` (conferido por script), e os arquivos de `components/ui` sem uso.
- `React.lazy` + `Suspense` em `router.tsx` para: páginas de acesso, workspace, página pública.
- Meta: chunk inicial ≤ 100 kB gzip (react-dom sozinho tem ~55 kB gzip).

## 5. CI (`.github/workflows/ci.yml`)

```
on: push, pull_request
jobs:
  checks: pnpm install --frozen-lockfile → typecheck → lint → test → build
  e2e:    needs checks; services.postgres(16); playwright install --with-deps chromium;
          pnpm test:e2e; upload do relatório quando falhar
```

Node 24 (o mesmo do `replit.md`); `SESSION_SECRET` de teste gerado no próprio job.

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Divisão do `App.tsx` muda comportamento | E2E de caracterização escrito antes (T2) e rodado depois (T3) |
| `strict` revela muitos erros | Corrigir no T1; se passar de ~40, ativar por partes e registrar |
| Overrides do `pnpm-workspace.yaml` removem binários de plataforma do CI Linux | Conferir no primeiro `pnpm install` do workflow; o setup local já mantém os do macOS |
| E2E instável por animação/rede | `reducedMotion: "reduce"` no contexto e esperas por estado, não por tempo |
