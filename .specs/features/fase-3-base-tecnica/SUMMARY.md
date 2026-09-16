# Fase 3 — validação (2026-09-17)

Branch `fase-0-correcoes-urgentes`, sem push.

## Gates (raiz do repositório)

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` (strict no front) | 0 erros |
| `pnpm lint` | 0 problemas |
| `pnpm test` (Vitest) | 25 testes: front 20 (orçamento 7, gestação 7, recomendações 6) + API 5 |
| `pnpm test:e2e` (Playwright + axe) | **34/34** — 17 cenários em 375 e 1280px |
| `PORT=5180 BASE_PATH=/ pnpm run build` | ok em todos os pacotes |

## Critérios de aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | lint, typecheck, test e build na raiz | ✅ |
| 2 | E2E sem violações sérias/críticas de axe | ✅ 34/34 |
| 3 | Mesmo E2E antes e depois da divisão | ✅ 32/32 em `c21866c` (antes) e em `be5699d` isolado (depois), com a pasta `e2e/` idêntica |
| 4 | Chunk inicial ≤ 100 kB gzip; página pública sem o workspace | ✅ 76,30 kB (antes 130,07); workspace em chunk próprio (18,12 kB); página pública 1,99 kB |
| 5 | Marcar item = 1 requisição | ✅ teste E2E "marcar um item faz só o PATCH" |
| 6 | GET do workspace sem INSERT | ✅ `profiles_id_seq` igual depois de 3 leituras (conta nova no `ninho_test`) |
| 7 | `ci.yml` válido e documentado | ✅ YAML validado; `ci.md` explica como tornar obrigatório. Ainda não executado no GitHub |

## Números

| Antes da fase | Depois |
|---|---|
| `App.tsx` com ~3.100 linhas | 29 linhas; maior módulo `use-workspace.ts` (≈440) |
| 1 arquivo de teste (node:test) | 4 arquivos Vitest + 3 specs E2E |
| JS inicial 130,07 kB gzip, chunk único | 76,30 kB + chunks por rota |
| CSS 20,46 kB gzip | 8,60 kB |
| 62 dependências no front | 19 |

## Bugs encontrados e corrigidos na fase

1. Preço digitado tecla a tecla ("45,90" virava R$ 4,02) e quantidade que não podia ser apagada.
2. Login recusando senha curta com a regra do cadastro (vazava a regra).
3. Senha errada levando à tela de "sessão expirada".
4. `PUT /api/me/profile` como primeiro acesso criava conta sem os itens padrão.

## Fora de escopo, observado

- CI só roda depois do push; tornar obrigatório é configuração do repositório.
- `login-pregnancy.png` continua em `public/`, sem uso (decisão do dono).
- Ajustes de texto e consistência anotados em STATE.md.
