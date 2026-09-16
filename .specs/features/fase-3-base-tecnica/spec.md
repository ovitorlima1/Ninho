# Fase 3 — Base técnica

**Tamanho:** Large (ferramentas novas, refatoração estrutural, performance, CI).
**Design:** `design.md` (estrutura de módulos, estratégia de testes, cache).
**Origem:** auditoria "Raio-X do Ninho" — A11, A12, M7, M8, M9.
**Depende de:** Fases 0–2 (branch `fase-0-correcoes-urgentes`).

## Problema

Todo o front está num `App.tsx` de ~3.000 linhas. Só existem testes unitários de três
arquivos, sem lint, sem E2E e sem CI — os erros C2 e C3 da auditoria chegaram à produção
por isso. O bundle é um chunk único de 130 kB gzip com ~90 kB de dependências sem uso,
quem abre o link público de presentes baixa o app inteiro, e cada toque na lista recarrega
o workspace inteiro (cujo GET ainda faz uma escrita no banco).

## Decisões (2026-09-16)

1. Ferramentas novas como dependências de desenvolvimento: **Vitest**, **Playwright + axe**,
   **ESLint** (typescript-eslint, react-hooks, jsx-a11y). `sharp` não entra (ver 2).
2. **Inspirações sem foto:** os cards trocam as 2 fotos genéricas repetidas por um bloco com
   o ícone da categoria na paleta do app.
3. **CI só como arquivo:** `.github/workflows/ci.yml` é criado; nada é enviado ao GitHub. Tornar
   o CI obrigatório na `main` é configuração do dono do repositório (documentada).

## Requisitos

### Qualidade (A12)

| ID | Requisito |
|---|---|
| F3-R1 | Testes unitários do front e da API rodam com Vitest (`pnpm test` na raiz). Os testes atuais (recomendações, orçamento, gestação, limitador) migram sem perder casos. |
| F3-R2 | ESLint com typescript-eslint, react-hooks e jsx-a11y (`pnpm lint` na raiz), 0 erros. |
| F3-R3 | E2E com Playwright contra API + Vite reais e um banco de teste separado (`ninho_test`), cobrindo: cadastro + onboarding, lista (status, adicionar com preço, editar, remover e desfazer), orçamento (valor investido), marcos, perfil, sessão expirada, recuperação de senha limitada e página pública de presentes. |
| F3-R4 | Cada tela coberta pelo E2E passa no axe (WCAG 2.2 A/AA) sem violações sérias ou críticas, em 375px e 1280px. |
| F3-R5 | `typecheck` com `strict` no front. |
| F3-R6 | Workflow de CI (push e pull request): instala, typecheck, lint, testes unitários, build e E2E com Postgres de serviço. |

### Estrutura (A11)

| ID | Requisito |
|---|---|
| F3-R7 | `App.tsx` vira só a composição da aplicação (≤ 80 linhas). Telas, componentes, hooks e utilitários vivem em módulos separados conforme `design.md`; nenhum arquivo de componente passa de ~400 linhas. |
| F3-R8 | O E2E escrito antes da refatoração passa sem mudança depois dela (teste de caracterização). |

### Performance e dados (M7, M8, M9)

| ID | Requisito |
|---|---|
| F3-R9 | Remover dependências e componentes `components/ui` sem uso; `Toaster` e `TooltipProvider` saem. |
| F3-R10 | Code-splitting por rota: páginas de acesso, workspace e página pública carregam em chunks separados. O chunk inicial da página pública não inclui o workspace. |
| F3-R11 | Chunk JS inicial ≤ 100 kB gzip. |
| F3-R12 | Cards de inspiração sem foto: bloco com ícone da categoria. Imagens sem uso saem de `public/images`. |
| F3-R13 | Gravações de item, marco, perfil e orçamento atualizam o cache com a resposta da API (`setQueryData`); o workspace só é recarregado em caso de erro. |
| F3-R14 | O seed de dados padrão acontece no cadastro; `GET /api/me/workspace` só lê (contas antigas sem perfil continuam sendo inicializadas na primeira leitura). |

## Fora de escopo

- Monitoramento de erros (Sentry) e health check com banco → Fase 4.
- Especificar todas as rotas no OpenAPI e usar o cliente gerado → feature própria (grande e
  sem ganho visível agora).
- Fotos reais de produto nas inspirações.

## Critérios de aceite

1. `pnpm lint`, `pnpm run typecheck`, `pnpm test` e o build passam na raiz.
2. `pnpm test:e2e` passa com 0 violações sérias/críticas de axe.
3. O mesmo E2E passa antes e depois da divisão do `App.tsx`.
4. Chunk inicial ≤ 100 kB gzip; a página pública não baixa o chunk do workspace.
5. Marcar um item faz 1 requisição (o PATCH), sem GET do workspace em seguida.
6. `GET /api/me/workspace` não executa INSERT para uma conta já inicializada.
7. `.github/workflows/ci.yml` válido (sintaxe conferida) e documentado.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| F3-R1, R2, R5 | T1 | pendente |
| F3-R3, R4 | T2 | pendente |
| F3-R7, R8 | T3 | pendente |
| F3-R13, R14 | T4 | pendente |
| F3-R9–R12 | T5 | pendente |
| F3-R6 | T6 | pendente |
| — | T7 (validação) | pendente |
