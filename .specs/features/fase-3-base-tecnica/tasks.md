# Tarefas — Fase 3

```
T1 Vitest + ESLint + strict ──► T2 E2E de caracterização ──► T3 dividir App.tsx ──► T4 cache (M9) ──► T5 bundle e imagens ──► T7 validação
                                                    T6 CI [P] (arquivo isolado) ─────────────────────────────────────────────┘
```

---

### T1 — Vitest, ESLint e strict (A12)
- **What:** Vitest no front e na API, migrando os 4 arquivos de teste; scripts `test` nos pacotes e na raiz; ESLint flat config (typescript-eslint, react-hooks, jsx-a11y) com `pnpm lint`; `strict: true` no front e correções.
- **Where:** `package.json` (raiz e pacotes), `eslint.config.js`, `artifacts/ninho/tsconfig.json`, `vitest.config.ts` por pacote, código tocado pelos erros.
- **Done when:** F3-R1, F3-R2, F3-R5; `pnpm test`, `pnpm lint`, `pnpm run typecheck` verdes.
- **Commit:** `chore(A12): Vitest, ESLint e TypeScript strict`

### T2 — E2E de caracterização com axe (A12)
- **Depends on:** T1.
- **What:** Playwright + axe em `artifacts/ninho/e2e/`, banco `ninho_test`, servidores em portas próprias; os fluxos de F3-R3; axe em cada tela em 375 e 1280px.
- **Done when:** F3-R3, F3-R4; `pnpm test:e2e` verde contra o código atual.
- **Commit:** `test(A12): E2E dos fluxos principais com axe`

### T3 — Dividir o App.tsx (A11)
- **Depends on:** T2.
- **What:** mover componentes, hooks e utilitários para a estrutura do `design.md` §1, sem mudar comportamento.
- **Done when:** F3-R7, F3-R8; typecheck, lint, unitários e **o mesmo E2E** verdes.
- **Commit:** `refactor(A11): App.tsx dividido em telas, componentes e utilitários`

### T4 — Cache e seed (M9)
- **Depends on:** T3.
- **What:** `setQueryData` com a resposta da API; invalidar só em erro; seed no cadastro e GET só leitura.
- **Done when:** F3-R13, F3-R14; E2E confere 1 requisição ao marcar item; teste de API/inspeção confirma GET sem INSERT.
- **Commit:** `perf(M9): cache atualizado pela resposta da API e seed no cadastro`

### T5 — Bundle e imagens (M8, M7)
- **Depends on:** T3.
- **What:** remover deps e `components/ui` sem uso, `Toaster` e `TooltipProvider`; `React.lazy` por rota; inspirações com ícone da categoria e remoção das imagens sem uso.
- **Done when:** F3-R9 a F3-R12; chunk inicial ≤ 100 kB gzip.
- **Commit:** `perf(M8,M7): code-splitting por rota, dependências sem uso fora e inspirações sem foto`

### T6 [P] — Workflow de CI (A12)
- **What:** `.github/workflows/ci.yml` conforme `design.md` §5; sintaxe validada localmente; instruções para tornar obrigatório.
- **Done when:** F3-R6.
- **Commit:** `ci(A12): workflow com typecheck, lint, testes, build e E2E`

### T7 — Validação e docs
- **What:** os 7 critérios de aceite; atualizar `.specs/codebase/TESTING.md`, `STRUCTURE.md`, `CONCERNS.md`, STATE, ROADMAP, SUMMARY e `replit.md`.
- **Commit:** `docs: fecha Fase 3`

## Status

| Tarefa | Status | Commit |
|---|---|---|
| T1 | pendente | |
| T2 | pendente | |
| T3 | pendente | |
| T4 | pendente | |
| T5 | pendente | |
| T6 | pendente | |
| T7 | pendente | |
