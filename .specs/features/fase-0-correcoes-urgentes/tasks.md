# Tarefas — Fase 0

Legenda: `[P]` = pode rodar em paralelo (arquivos disjuntos). Commits: um por tarefa,
mensagem `tipo(ACHADO): descrição`.

## Plano de execução

```
T1 (C2) ──► T3 (C1 piso 12px) ──┐
T2 (C1/A2 viewport, lang, 16px) ─┤
T4 (C5 lixeira) ─────────────────┼──► T8 (validação + docs)
T5 (C3 orçamento) ───────────────┤
T6 (C4 catálogo) [P] ────────────┤
T7 (A9 reset) [P] ───────────────┘
```

T1–T5 tocam `App.tsx`/`index.css` → sequenciais no contexto principal.
T6 (só `lib/recommendations*`) e T7 (só `api-server`) → sub-agentes em paralelo, sem commit (o orquestrador commita).

---

### T1 — Aplicar as regras de legibilidade à Linha do tempo (C2)
- **What:** mover a classe `timeline-panel` do OverviewPanel para o TimelinePanel.
- **Where:** `artifacts/ninho/src/App.tsx:514` e `:718`.
- **Done when:** F0-R5; verificação visual da Linha do tempo e da Visão geral em 375px e 1280px sem regressão de layout.
- **Tests:** visual (navegador).
- **Commit:** `fix(C2): aplica estilos de legibilidade ao painel da linha do tempo`

### T2 — Viewport, idioma e campos com 16px (C1, A2)
- **What:** remover `maximum-scale=1`; `lang="pt-BR"`; `input, textarea, select { font-size: max(16px, 1rem) }` com especificidade suficiente para vencer as regras de 13–14px existentes; ajustar alturas/larguras que quebrarem (ex.: `.budget-row input` 80px).
- **Where:** `artifacts/ninho/index.html`, `artifacts/ninho/src/index.css`.
- **Done when:** F0-R1, R2, R3 (medido no navegador).
- **Commit:** `fix(C1,A2): libera zoom, declara pt-BR e usa 16px nos campos`

### T3 — Piso de 12px em todo texto visível (C1)
- **Depends on:** T1 (as regras da timeline já corrigem parte dos 5–7px).
- **What:** subir `--type-label` para 12px (0.75rem) e trocar toda declaração literal < 12px por ≥ 12px, apagando a declaração antiga em vez de sobrescrever; reajustar containers que dependiam de texto minúsculo (grade de 40 semanas, chips, rótulos do desktop).
- **Where:** `artifacts/ninho/src/index.css`.
- **Done when:** F0-R4 — script de medição retorna 0 em 375px e 1280px em todas as telas listadas; sem estouro horizontal em 320px.
- **Tests:** script de medição no navegador (registrado em SUMMARY/validação).
- **Commit:** `fix(C1): piso de 12px para todo texto visível`

### T4 — Lixeira visível no toque e no foco (C5)
- **What:** `:focus-within` e `@media (hover: none)` para `.delete-item-btn`, área 44×44 no toque.
- **Where:** `artifacts/ninho/src/index.css:781–787`.
- **Done when:** F0-R13, R14 (opacidade computada 1 e tamanho ≥ 44 em 375px emulado como touch).
- **Commit:** `fix(C5): botão de remover visível no toque e no foco`

### T5 — Selector único de "investido" (C3)
- **What:** `lib/budget.ts` com `calcSpentCents(items)` e `calcSpent(items)`; `lib/budget.test.ts` (node:test, mesmo padrão do teste de recomendações); script `test:budget` e `test` agregador no `package.json` do front; trocar `App.tsx:507` e `:839` pelo selector.
- **Where:** `artifacts/ninho/src/lib/budget.ts` (novo), `budget.test.ts` (novo), `App.tsx`, `artifacts/ninho/package.json`.
- **Done when:** F0-R6, R7, R8; cenário Body+Macacão = R$ 370,00 nas duas telas.
- **Gate:** `pnpm --filter @workspace/ninho run test`
- **Commit:** `fix(C3): investido soma preço × quantidade só de itens comprados`

### T6 [P] — Renovar catálogo e limitar timer (C4)
- **What:** datas novas no catálogo; `Math.min(…, 3_600_000)` no delay; testes relativos às datas do catálogo; teste de alerta (< 14 dias); teste do limite do delay.
- **Where:** `artifacts/ninho/src/lib/recommendations.ts`, `recommendations.test.ts`.
- **Done when:** F0-R9–R12.
- **Gate:** `pnpm --filter @workspace/ninho run test:recommendations`
- **Commit:** `fix(C4): renova catálogo de inspirações até 2026-12-10 e limita o timer`

### T7 [P] — Limite na recuperação de senha (A9)
- **What:** dois limitadores (`AuthAttemptLimiter` existente) — e-mail 3/h, IP 10/h — aplicados após validar o e-mail; resposta 429 + `Retry-After` + mensagem pt-BR; teste unitário do limitador configurado; script `test` no api-server (compila com `tsc` para `/tmp` e roda `node --test`, mesmo padrão do front).
- **Where:** `artifacts/api-server/src/lib/auth.ts`, `src/routes/auth.ts`, `src/lib/auth.test.ts` (novo), `artifacts/api-server/package.json`.
- **Done when:** F0-R15–R18.
- **Gate:** `pnpm --filter @workspace/api-server run test` e `typecheck`.
- **Commit:** `fix(A9): limita pedidos de recuperação de senha por e-mail e IP`

### T8 — Validação da fase e docs
- **What:** rodar gates (typecheck, testes, build); validar critérios de aceite no navegador (375/1280, cenário do orçamento, inspirações, 429 na tela); atualizar rastreio em `spec.md`, STATE.md, ROADMAP.md e a regra de orçamento no `replit.md`.
- **Commit:** `docs: fecha Fase 0 (spec, rastreio e regra de orçamento)`

## Status

| Tarefa | Status | Commit |
|---|---|---|
| T1 | concluído | bb5209a |
| T2 | concluído | 1d38d67 |
| T3 | concluído | 3b6e594 |
| T4 | concluído | d851b70 |
| T5 | concluído | 0b83a1f |
| T6 | concluído | e094dec |
| T7 | concluído | 951d38d |
| T8 | concluído | (este commit) |
