# Ninho — Gestão de Enxoval

Um app web mobile-first para gestantes organizarem o enxoval do bebê com checklist personalizado, progresso visual acolhedor, marcos de preparação e controle de orçamento.

## Run & Operate

- `pnpm --filter @workspace/ninho run dev` — frontend Vite (porta configurada por PORT)
- `pnpm dev` — stack local (Postgres no Docker, API na 8787, Vite na 5180)
- `pnpm --filter @workspace/api-server run dev` — API Express (porta definida por PORT)
- `pnpm --filter @workspace/db run push` — push do schema Drizzle para o banco (dev)
- `pnpm --filter @workspace/db run push-force` — push forçado (sem confirmação interativa)
- `pnpm run typecheck` — typecheck completo em todos os pacotes (strict no front)
- `pnpm lint` — ESLint (TypeScript, hooks do React, acessibilidade)
- `pnpm test` — testes unitários (Vitest) do front e da API
- `pnpm test:e2e` — E2E com Playwright + axe num banco `ninho_test` (precisa do Postgres do `docker-compose.dev.yml`)
- `pnpm run build` — typecheck + build de todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas Zod do spec OpenAPI
- Required env: `DATABASE_URL`, `SESSION_SECRET` (mínimo de 32 caracteres)
- Opcional: `ALLOWED_ORIGINS` (lista separada por vírgulas) para liberar outros domínios do front nas rotas que alteram dados
- Para recuperação de senha em produção: `PUBLIC_APP_URL` (URL HTTPS canônica do app) e `RESEND_FROM_EMAIL` (remetente verificado no Resend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, Wouter (roteamento), @tanstack/react-query
- Auth: contas próprias com senha protegida por scrypt e sessão JWT em cookie HttpOnly
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir do OpenAPI spec em `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle do servidor)

## Where things live

- `artifacts/ninho/src/App.tsx` — só providers e roteador; `app/router.tsx` carrega cada área sob demanda (React.lazy)
- `artifacts/ninho/src/layout/app-shell.tsx` — `AppShell` + `NAV_ITEMS` (Início, Lista, Marcos, Orçamento, Perfil)
- `artifacts/ninho/src/features/<área>/` — telas (auth, onboarding, overview, checklist, timeline, budget, profile, recommendations, gift, workspace); `features/workspace/use-workspace.ts` concentra query e mutations
- `artifacts/ninho/src/components/` — peças reutilizáveis (fita métrica, ModalShell, campo numérico, ícone de categoria); `lib/` — regras puras testadas
- `artifacts/ninho/e2e/` — testes E2E (Playwright + axe); `.github/workflows/ci.yml` — CI
- `artifacts/ninho/src/lib/api.ts` — cliente tipado para a API REST
- `artifacts/ninho/src/index.css` — só importa as camadas de estilo, em ordem
- `artifacts/ninho/src/styles/tokens.css` — design system (única fonte de cor, tipo, espaço, raio, sombra e movimento; identidade lilás: fundos lavanda, ação em roxo, Montserrat + Space Mono)
- `artifacts/ninho/src/styles/{base,components,layout}.css` — reset e tipografia, um bloco por componente, casca e pontos de quebra (600 e 900px)
- `artifacts/api-server/src/routes/me.ts` — todas as rotas autenticadas `/api/me/*`
- `artifacts/api-server/src/routes/health.ts` — health check `/api/healthz`
- `artifacts/api-server/src/lib/seed.ts` — seed de dados padrão para novos usuários
- `artifacts/api-server/src/routes/auth.ts` — cadastro, login, sessão atual, recuperação e logout (deste aparelho)
- `artifacts/api-server/src/routes/account.ts` — sair de todos os aparelhos, exportar dados e excluir conta (`/api/me/...`)
- `artifacts/api-server/src/lib/sessions.ts` — sessões por aparelho (`auth_sessions`); `lib/rate-limit.ts` — limites de tentativa no Postgres (`auth_attempts`)
- `artifacts/api-server/src/middlewares/security.ts` — cabeçalhos, checagem de origem, 404 e erros em JSON
- `artifacts/api-server/src/middlewares/requireAuth.ts` — valida o JWT e a sessão registrada no banco
- `lib/db/src/schema/` — tabelas Drizzle (authUsers com sessões e tentativas, profiles, checklistItems, milestones, budgetCategories, giftSharing) e os schemas Zod de validação
- `lib/db/drizzle.config.ts` — configuração do Drizzle Kit
- `lib/api-spec/openapi.yaml` — spec OpenAPI (source of truth para codegen)
- `lib/api-client-react/src/` — hooks React Query gerados pelo Orval

## Architecture decisions

- **ID próprio como chave de ownership**: contas novas recebem UUIDs próprios, usados em todas as tabelas do workspace. Dados legados de outras identidades não são reutilizados.
- **Seed no cadastro**: `initializeUser()` cria perfil, itens, marcos e orçamento na mesma requisição do cadastro; `GET /api/me/workspace` é só leitura (`ensureUserInitialized` inicializa apenas contas antigas sem perfil).
- **Workspace endpoint único**: `GET /api/me/workspace` retorna todo o estado do usuário (profile + items + milestones + budget) em uma só chamada para reduzir round-trips.
- **Otimismo no cliente**: mutações de checklist e marcos usam `onMutate` para atualização otimista e gravam a resposta da API no cache; o workspace só é recarregado em caso de erro.
- **Onboarding na primeira entrada**: quando `profile.onboardingComplete === false`, o app exibe um modal de onboarding para capturar nome e data prevista antes de entrar no dashboard.
- **Shower/chá de bebê**: funcionalidade removida do MVP — não há backend. O link foi removido de todos os painéis.
- **Sessão em cookie HttpOnly, registrada no banco**: o JWT carrega o id da sessão (`sid`); sair revoga só o aparelho, "sair de todos" e a redefinição de senha revogam todos. Tokens nunca ficam acessíveis ao JavaScript do cliente.
- **Limites persistentes**: login, cadastro, recuperação, exclusão de conta e reserva pública ficam em `auth_attempts` (valem entre instâncias do autoscale); as chaves guardam só HMAC de e-mail/IP.
- **Superfície HTTP**: só JSON (64 kB), 403 para POST/PUT/PATCH/DELETE de outra origem, cabeçalhos de segurança e `no-store` nas rotas de conta. A CSP do front vai por `<meta>` e só entra no build (o Vite de dev usa scripts inline).
- **Logs sem dados pessoais**: tudo passa por `req.log`; o serializador de erro corta os valores das consultas do Drizzle.
- **LGPD**: exportação em JSON e exclusão imediata (senha + EXCLUIR) apagando todas as tabelas numa transação — não há foreign keys, então tabela nova com `user_id` precisa entrar em `routes/account.ts`.

## Product

- **Checklist de enxoval**: categorias (Roupas, Higiene, Alimentação, Acessórios), status por item (A comprar / Comprado / Ganhei), adicionar itens personalizados, remover itens
- **Dashboard**: progresso real calculado dos dados salvos, próximo marco, orçamento investido
- **Linha do tempo**: marcos de preparação semanais com toggle de conclusão; estado vazio amigável quando data prevista não está configurada
- **Orçamento**: planejado por categoria com total calculado; o "investido" soma preço unitário × quantidade só dos itens **Comprado** — "Ganhei" é presente e não conta como gasto (regra em `artifacts/ninho/src/lib/budget.ts`, com testes)
- **Perfil**: nome, cidade, data prevista do parto (usada para calcular semana atual), link de presentes e "Sua conta" (sair deste aparelho, sair de todos, exportar dados, excluir conta)
- **Onboarding**: modal de boas-vindas para novos usuários configurarem nome e data prevista

## Gotchas

- Nenhuma cor ou tamanho de fonte literal fora de `styles/tokens.css`. Texto roxo é sempre `--color-brand` (o lilás vivo `--color-brand-vivid`/`--color-progress` não passa no contraste como texto); verde (`--color-accent`) só como texto na variante `-strong`.
- A foto do login (`public/images/login-gestante.jpg`) é do Pexels (Jonathan Borba, Licença Pexels); troca de foto só com licença de uso registrada em `.specs/features/lilas-e-foto-login/`.
- E2E usa as portas 8790/5190; se outro projeto estiver nelas, rode com `E2E_API_PORT` e `E2E_WEB_PORT`.
- O progresso usa sempre o componente `Progress` (a "fita métrica"), que exige `label` para o leitor de tela.

- O pacote `lib/api-client-react` usa `composite: true` no TypeScript — após editar `src/index.ts`, rodar `tsc --build lib/api-client-react/tsconfig.json` para regenerar os arquivos `.d.ts` antes do typecheck do frontend.
- A API usa `numeric` do Postgres para o campo `price` — chega ao frontend como string e precisa de `parseFloat()` para converter.
- Tabela nova com `user_id` precisa entrar na exportação e na exclusão de conta (`routes/account.ts`) e na contagem do E2E (`e2e/account.spec.ts`).
- Mensagens de erro da API sempre em pt-BR; a resposta de validação usa só a primeira mensagem do schema (`lib/validation.ts`).
- O `drizzle-kit push` pode ser interativo — usar `push-force` em scripts de build para evitar prompts.

## Pointers

- Ver skill `pnpm-workspace` para estrutura do workspace, setup TypeScript e detalhes de pacotes
- Produção: `https://ninho-mother.replit.app`
