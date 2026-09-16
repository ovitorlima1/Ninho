# TESTING — Ninho

Estado depois da Fase 3 — Base técnica (branch `fase-0-correcoes-urgentes`, até `0c7ca8d`).
Nada foi enviado ao GitHub; o CI existe só como arquivo.

## Stack

| Camada | Ferramenta | Onde | Config |
|---|---|---|---|
| Unitário front | Vitest 5 (ambiente `node`) | `artifacts/ninho/src/**/*.test.ts` | `artifacts/ninho/vitest.config.ts` (alias `@` → `src`; não usa o `vite.config.ts`, que exige `PORT`/`BASE_PATH`) |
| Unitário API | Vitest 5 (ambiente `node`) | `artifacts/api-server/src/**/*.test.ts` | `artifacts/api-server/vitest.config.ts` |
| E2E + acessibilidade | Playwright **1.60.0** (Chromium) + `@axe-core/playwright` | `artifacts/ninho/e2e/` | `artifacts/ninho/playwright.config.ts` |
| Lint | ESLint 10 flat config: `@eslint/js`, `typescript-eslint`, `react-hooks`, `jsx-a11y` (só em `artifacts/ninho/**`) | repo inteiro | `eslint.config.mjs` (ignora `dist`, gerados do Orval, `artifacts/mockup-sandbox`, `attached_assets`, relatórios do Playwright) |
| Tipos | TypeScript 5.9, `strict: true` no front | — | `artifacts/ninho/tsconfig.json` (inclui `src`, `e2e`, `vitest.config.ts`, `playwright.config.ts`) |

Os testes agora são tipados pelo `typecheck` (antes o `tsconfig` do front excluía `*.test.ts`).
O antigo padrão `tsc → /tmp → node --test` saiu; os testes usam `import { test } from "vitest"`
e `node:assert/strict`.

## Comandos (na raiz)

| Gate | Comando | O que faz |
|---|---|---|
| Typecheck | `pnpm run typecheck` | `tsc --build` das libs + `tsc --noEmit` em `artifacts/*` e `scripts` |
| Lint | `pnpm lint` | `eslint .` — 0 erros exigidos |
| Unitários | `pnpm test` | `pnpm -r --if-present run test` → `vitest run` no front e na API; não precisa de banco |
| E2E | `pnpm test:e2e` | `pnpm --filter @workspace/ninho run test:e2e` → `playwright test`; precisa do Postgres (`pnpm db:up`) |
| Build | `PORT=5180 BASE_PATH=/ pnpm run build` | typecheck + build de todos os pacotes (o build do front exige as duas variáveis) |

Um pacote só: `pnpm --filter @workspace/ninho run test` ou `pnpm --filter @workspace/api-server run test`.
Um arquivo: `pnpm --filter @workspace/ninho exec vitest run src/lib/budget.test.ts`.

## Testes unitários (25)

| Arquivo | Casos | Cobre |
|---|---|---|
| `artifacts/ninho/src/lib/budget.test.ts` | 7 | "investido" = preço × quantidade só de "Comprado", em centavos; por categoria |
| `artifacts/ninho/src/lib/gestation.test.ts` | 7 | semana completa (`floor`), virada de semana, horário de verão, trava em 40, data inválida e limites da data prevista |
| `artifacts/ninho/src/lib/recommendations.test.ts` | 6 | visível/expirada/oculta/URL insegura, item vinculado expirado, fronteira de expiração, atraso do timer ≤ 1 h, **alarme de validade** |
| `artifacts/api-server/src/lib/attempts.test.ts` | 6 | regra dos limites (3/h por e-mail, 10/h por origem, `retryAfterSeconds`, fim do bloqueio, chave bloqueada não gasta as outras, janela vencida) |
| `artifacts/api-server/src/middlewares/security.test.ts` | 6 | checagem de origem (leituras, mesmo host, sem Origin/`Sec-Fetch-Site`, Origin nula, origens configuradas, localhost só fora de produção) |
| `artifacts/api-server/src/lib/sessions.test.ts` | 3 | token com `sid`, token antigo sem `sid` recusado, assinatura alterada |
| `artifacts/api-server/src/lib/logger.test.ts` | 2 | erro do Drizzle sem os valores da consulta na mensagem e no stack |

Front: 20. API: 17. Testes da API não importam `@workspace/db` (exigiria `DATABASE_URL`): regra pura fica em arquivo próprio.

**Teste-alarme proposital** (`recommendations.test.ts:77`): usa a data real e falha quando
algum item visível do catálogo tem menos de 14 dias de validade. O catálogo vence em
**2026-12-10**, então o teste passa a falhar a partir de **2026-11-26** — e com ele o `pnpm test`
e o job `checks` do CI. A correção é renovar a curadoria em `artifacts/ninho/src/lib/recommendations.ts`
(`reviewedAt`/`expiresAt`), não afrouxar o teste.

## E2E

### Ambiente (`playwright.config.ts`, `e2e/env.ts`, `e2e/global-setup.ts`)

- **Banco:** `E2E_DATABASE_URL`, padrão `postgres://ninho:ninho@localhost:5460/ninho_test`
  (o Postgres do `docker-compose.dev.yml`, banco separado). `assertTestDatabase` recusa
  qualquer banco cujo nome não termine em `_test`.
- **Segredo:** `E2E_SESSION_SECRET` (padrão fixo só para uso local).
- **globalSetup:** conecta em `/postgres`, cria o banco se faltar, roda
  `pnpm --filter @workspace/db run push-force` (`drizzle-kit push --force`) com o `DATABASE_URL` de teste
  e faz `TRUNCATE auth_attempts` (os limites ficam no banco desde a Fase 4).
- **Banco nos testes:** `e2e/db.ts` (`withTestDb`) abre um cliente só no banco `_test`, para
  inserir um token de redefinição ou contar linhas por tabela.
- **Servidores** (`webServer`, `reuseExistingServer: false`, sobem a cada execução): API em **8790** (`tsx src/index.ts`, `NODE_ENV=development`,
  `LOG_LEVEL=warn`) e Vite em **5190** (`API_PROXY_TARGET` → 8790). Não conflitam com o `pnpm dev` (8787/5180).
- **Projetos:** `celular` (Pixel 7 em 375×812) e `desktop` (Desktop Chrome em 1280×800).
  `locale: pt-BR`, `timezoneId: America/Sao_Paulo`, `reducedMotion: "reduce"`, trace só em falha.
  No CI: `retries: 1`, `workers: 2`, `forbidOnly`, relatório HTML.

### Apoio (`e2e/support.ts`)

- `createAccount(page, { displayName, dueDate })` cria a conta **pela API** (register → GET
  workspace → PUT profile com `onboardingComplete: true`), deixando a sessão no navegador.
  Cada cadastro manda um `X-Forwarded-For` aleatório (`10.x.x.x`): o limitador de cadastro é
  por IP, e sem isso as dezenas de contas da suíte bateriam no limite. Funciona porque a API
  só confia no XFF vindo de loopback (`app.set("trust proxy", "loopback")`,
  `artifacts/api-server/src/app.ts:10`) — ou seja, via proxy do Vite; um cliente direto não
  consegue forjar.
- `uniqueEmail`, `isoDaysFromToday`, `itemRow(page, nome)` (linha `.check-item-row`), `PASSWORD`, `randomClientIp()` (para logins extras).
- `expectAccessible(page)`: axe com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
  `wcag22aa`; falha só com violações `serious` ou `critical`. Chamado em 10 pontos da suíte.

### Cenários (27 × 2 projetos = 54)

`e2e/auth.spec.ts` (4)
1. cadastro valida por campo e o onboarding leva ao Início
2. login mostra erro por campo sem travar senha curta
3. recuperação de senha limita o quarto pedido na mesma hora (e o contador está no banco, sem o e-mail)
4. redefinir a senha tira o token da URL e derruba as sessões abertas

`e2e/account.spec.ts` (5)
1. sair deste aparelho revoga o token na hora
2. sair de todos os aparelhos derruba as outras sessões
3. exportar meus dados baixa um JSON com a lista e sem o token do link
4. excluir a conta pede senha e EXCLUIR e apaga tudo (contagem de linhas por tabela)
5. a API recusa excluir sem a palavra de confirmação

`e2e/security.spec.ts` (4)
1. cabeçalhos de segurança e sem X-Powered-By
2. outro site não consegue alterar dados (Origin e `Sec-Fetch-Site`)
3. corpo que não é JSON é recusado com mensagem em português
4. orçamento só aceita as quatro categorias conhecidas

`e2e/checklist.spec.ts` (8; `beforeEach` cria conta e abre `/checklist`)
1. status muda direto, sem ciclo escondido
2. marcar um item faz só o PATCH, sem recarregar o workspace (M9)
3. adicionar item com quantidade e preço digitados tecla a tecla
4. editar preço e quantidade de um item existente
5. remover mostra desfazer e o desfazer devolve o item
6. Esc fecha o diálogo e devolve o foco ao botão de origem
7. orçamento soma só o que foi comprado, preço × quantidade
8. aba Inspirações dentro da Lista

`e2e/workspace.spec.ts` (6)
1. cinco destinos, com o mesmo nome na navegação e no título
2. marcos mostram atrasado com a data real
3. data prevista no passado trava em 40 e pergunta sobre a chegada
4. perfil sempre editável, com salvar só quando muda algo
5. sessão expirada leva ao login com aviso (`context.clearCookies()`)
6. página pública de presentes reserva um item sem conta

**Resultado:** a última execução registrada (validação da Fase 4) foi **54/54 passando**
(27 cenários × 2 projetos). A suíte é de caracterização: a mesma rodou
antes e depois da divisão do `App.tsx` (32/32 em `be5699d`, antes do cenário de PATCH único).

## Como escrever um teste novo

**Unitário (front):** só para código puro de `src/lib/` (sem React/DOM).
1. Criar `src/lib/<modulo>.test.ts` ao lado do módulo; importar com `@/lib/...` ou caminho relativo.
2. `import { test } from "vitest"; import assert from "node:assert/strict";`
3. Datas entram por parâmetro (`now`), nunca `new Date()` dentro do teste — exceto o alarme do catálogo.
4. Rodar `pnpm test`. Não há nada para registrar: o `include` pega `src/**/*.test.ts`.

**Unitário (API):** mesmo padrão em `artifacts/api-server/src/**`. Código que importa
`@workspace/db` lança sem `DATABASE_URL`; mantenha o alvo puro (ex.: `lib/auth.ts`) ou use o
banco de teste. Limitadores são singletons de processo: use chaves únicas por teste.

**E2E:**
1. Criar ou editar `artifacts/ninho/e2e/<area>.spec.ts`; importar de `./support`.
2. Começar com `await createAccount(page)` (conta nova por teste → sem ordem nem limpeza).
3. Localizar por papel/nome (`getByRole`) ou `data-testid`; esperar estado, não tempo.
4. Digitação real com `pressSequentially`; envio por Enter com `form.requestSubmit()`.
5. Terminar cada tela nova com `await expectAccessible(page)`.
6. `pnpm db:up && pnpm test:e2e` (os dois projetos rodam por padrão; `--project=celular` para um só).

## CI (`.github/workflows/ci.yml`)

Dispara em `push` (qualquer branch) e `pull_request`; cancela execuções antigas da mesma ref;
`permissions: contents: read`; Node 24, pnpm 11.17.0 (fixado em `PNPM_VERSION`).

- **`checks`** (ubuntu, 20 min): `pnpm install --frozen-lockfile` → `pnpm run typecheck` →
  `pnpm run lint` → `pnpm run test` → `pnpm run build` com `PORT=5180 BASE_PATH=/`.
- **`e2e`** (`needs: checks`, 30 min): serviço `postgres:16` (ninho/ninho, porta 5432, health-check);
  `E2E_DATABASE_URL=postgres://ninho:ninho@localhost:5432/ninho_test`; `E2E_SESSION_SECRET`
  gerado com `openssl rand -hex 32`; `playwright install --with-deps chromium`;
  `pnpm run test:e2e`; em falha publica `playwright-report` e `test-results` por 7 dias.

**O workflow nunca rodou no GitHub** (nenhum push). Torná-lo obrigatório na `main` é
configuração do dono do repositório — passo a passo em
`.specs/features/fase-3-base-tecnica/ci.md`.

## Lacunas conhecidas

- Sem teste de componente React (a cobertura de UI é toda pelo E2E).
- Sem teste de rota da API isolado; as rotas são exercitadas só pelo E2E.
- Sem medição de cobertura nem Lighthouse automatizado.
- O E2E depende de Docker local (Postgres na 5460).
