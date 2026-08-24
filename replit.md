# Ninho — Gestão de Enxoval

Um app web mobile-first para gestantes organizarem o enxoval do bebê com checklist personalizado, progresso visual acolhedor, marcos de preparação e controle de orçamento.

## Run & Operate

- `pnpm --filter @workspace/ninho run dev` — frontend Vite (porta configurada por PORT)
- `pnpm --filter @workspace/api-server run dev` — API Express (porta 8080)
- `pnpm --filter @workspace/db run push` — push do schema Drizzle para o banco (dev)
- `pnpm --filter @workspace/db run push-force` — push forçado (sem confirmação interativa)
- `pnpm run typecheck` — typecheck completo em todos os pacotes
- `pnpm run build` — typecheck + build de todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas Zod do spec OpenAPI
- Required env: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, Wouter (roteamento), @tanstack/react-query
- Auth: Clerk v6 (@clerk/react no frontend, @clerk/express no backend)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir do OpenAPI spec em `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle do servidor)

## Where things live

- `artifacts/ninho/src/App.tsx` — toda a aplicação frontend (componentes, roteamento, hooks)
- `artifacts/ninho/src/lib/api.ts` — cliente tipado para a API REST
- `artifacts/ninho/src/index.css` — estilos globais e design system
- `artifacts/api-server/src/routes/me.ts` — todas as rotas autenticadas `/api/me/*`
- `artifacts/api-server/src/routes/health.ts` — health check `/api/healthz`
- `artifacts/api-server/src/lib/seed.ts` — seed de dados padrão para novos usuários
- `artifacts/api-server/src/middlewares/requireAuth.ts` — middleware Clerk para rotas protegidas
- `lib/db/src/schema/` — tabelas Drizzle: profiles, checklistItems, milestones, budgetCategories
- `lib/db/drizzle.config.ts` — configuração do Drizzle Kit
- `lib/api-spec/openapi.yaml` — spec OpenAPI (source of truth para codegen)
- `lib/api-client-react/src/` — hooks React Query gerados pelo Orval

## Architecture decisions

- **userId do Clerk como ownership key**: todas as tabelas de dados do usuário usam `userId` (string do Clerk) para isolamento. Nenhum dado é compartilhado entre contas.
- **Seed automático na primeira entrada**: `seedNewUser()` insere itens de checklist padrão, marcos e orçamento para novos usuários (idempotente — verifica se já existem itens antes de inserir).
- **Workspace endpoint único**: `GET /api/me/workspace` retorna todo o estado do usuário (profile + items + milestones + budget) em uma só chamada para reduzir round-trips.
- **Otimismo no cliente**: mutações de checklist e marcos usam `onMutate` do React Query para atualização otimista imediata, com rollback automático em caso de erro.
- **Onboarding na primeira entrada**: quando `profile.onboardingComplete === false`, o app exibe um modal de onboarding para capturar nome e data prevista antes de entrar no dashboard.
- **Shower/chá de bebê**: funcionalidade removida do MVP — não há backend. O link foi removido de todos os painéis.
- **Auth token para API**: `setAuthTokenGetter` do `@workspace/api-client-react` é configurado com `getToken()` do Clerk no componente `Workspace`, garantindo que todas as chamadas à API incluam o bearer token.

## Product

- **Checklist de enxoval**: categorias (Roupas, Higiene, Alimentação, Acessórios), status por item (A comprar / Comprado / Ganhei), adicionar itens personalizados, remover itens
- **Dashboard**: progresso real calculado dos dados salvos, próximo marco, orçamento investido
- **Linha do tempo**: marcos de preparação semanais com toggle de conclusão; estado vazio amigável quando data prevista não está configurada
- **Orçamento**: planejado por categoria com total calculado; itens marcados como resolvidos contam como gastos
- **Perfil**: nome, cidade, data prevista do parto (usada para calcular semana atual)
- **Onboarding**: modal de boas-vindas para novos usuários configurarem nome e data prevista

## Gotchas

- O pacote `lib/api-client-react` usa `composite: true` no TypeScript — após editar `src/index.ts`, rodar `tsc --build lib/api-client-react/tsconfig.json` para regenerar os arquivos `.d.ts` antes do typecheck do frontend.
- A API usa `numeric` do Postgres para o campo `price` — chega ao frontend como string e precisa de `parseFloat()` para converter.
- O `drizzle-kit push` pode ser interativo — usar `push-force` em scripts de build para evitar prompts.
- O Clerk v6 usa `"signed-in"/"signed-out"` no componente `<Show when="...">` (não `"authenticated"/"unauthenticated"` como em versões anteriores).
- Para autenticar chamadas à API: `setAuthTokenGetter` deve ser chamado com `getToken()` do `useAuth()` do Clerk dentro do contexto autenticado. Cookies de sessão do Clerk não são suficientes em todos os ambientes.

## Pointers

- Ver skill `pnpm-workspace` para estrutura do workspace, setup TypeScript e detalhes de pacotes
- Ver skill `clerk-auth` para configuração do Clerk no Replit
- Produção: `https://ninho-mother.replit.app`
