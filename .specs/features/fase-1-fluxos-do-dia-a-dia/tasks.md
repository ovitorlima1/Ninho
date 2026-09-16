# Tarefas — Fase 1

Duas ondas. Commits: um por tarefa, `tipo(ACHADO): descrição`.

```
Onda 1 (núcleo da lista)          Onda 2 (o resto)
T1 diálogo único (A6) ──► T3 editar/adicionar item (A4)   T7 orçamento (M2) [P]
T2 status explícito (A3)                                  T8 marcos e semana (M5) [P]
T4 onboarding (A7) ◄── depende de T1                      T9 desfazer/confirmar (M13)
T5 sessão 401 (A8) [P]                                    T10 perfil e mensagens (M14, B1)
T6 formulários de acesso (M1) [P]                         T11 validação + docs
```

`[P]` = arquivos praticamente disjuntos; pode ir para sub-agente. T1, T2 e T3 mexem no mesmo
trecho do `App.tsx` e são sequenciais.

---

### T1 — Componente único de diálogo (A6)
- **What:** um `<Dialog>` interno (baseado no `RecommendationLinkModal`, que já faz foco inicial, trap, Esc e retorno de foco, ou no `ui/dialog.tsx` do Radix) e migrar `AddItemModal`, `GiftReservationModal`, `RecommendationLinkModal` e `OnboardingModal`. Conteúdo dentro de `<form onSubmit>`.
- **Where:** `App.tsx` (1253–1520 e 322–420), novo `components/dialog-shell.tsx` ou uso do Radix.
- **Done when:** F1-R6, F1-R7 — cada modal fecha com Esc, prende foco, devolve o foco e envia com Enter.
- **Commit:** `refactor(A6): diálogo único com foco, Esc e envio por Enter`

### T2 — Status explícito por item (A3)
- **What:** trocar o botão de ciclo por um `role="radiogroup"` com as três opções; `pendingId` no lugar de `isActionPending` global; item mostra "6 un. × R$ 38,00 · R$ 228,00".
- **Where:** `App.tsx` `ChecklistPanel` (565–702) e as mutations (~1700–1830); `index.css`.
- **Done when:** F1-R1, F1-R2, F1-R5.
- **Commit:** `feat(A3): status do item vira controle explícito de três opções`

### T3 — Editar e adicionar item com preço e quantidade (A4)
- **Depends on:** T1, T2.
- **What:** folha de edição (nome, quantidade, preço unitário, categoria) aberta pelo nome do item; `AddItemModal` ganha quantidade e preço; fechar só no `onSuccess`.
- **Where:** `App.tsx`; usa `PATCH /api/me/checklist/:id` e `POST /api/me/checklist` (já aceitam `price` e `qty`).
- **Done when:** F1-R3, F1-R4; cenário "Manta 2 × R$ 45" soma R$ 90 no investido.
- **Commit:** `feat(A4): editar preço e quantidade do item`

### T4 — Onboarding que avisa quando falha (A7)
- **Depends on:** T1.
- **What:** `onError` com mensagem no modal; `min`/`max` na data (hoje −6 semanas … +42 semanas) com validação explícita; "Entrar" exige data válida.
- **Where:** `App.tsx` `OnboardingModal` (322–420).
- **Done when:** F1-R8, F1-R9, F1-R10.
- **Commit:** `fix(A7): onboarding valida a data e mostra erro quando falha`

### T5 [P] — Sessão expirada (A8)
- **What:** `QueryCache`/`MutationCache` com `onError` para 401 → limpa cache e vai para `/sign-in?expirou=1`; a tela de login mostra o aviso.
- **Where:** `App.tsx` (QueryClient ~2745, telas de auth), `lib/api.ts` se precisar expor o status.
- **Done when:** F1-R11.
- **Commit:** `fix(A8): sessão expirada leva ao login com aviso`

### T6 [P] — Erros por campo no acesso (M1)
- **What:** estado de erro por campo com `aria-invalid`/`aria-describedby`, foco no primeiro erro, validação de e-mail e de senhas iguais no cadastro, regra de senha como texto fixo, remover a validação de 8 caracteres no login.
- **Where:** `App.tsx` telas de auth (~2430–2740); `index.css` para o estilo de erro por campo.
- **Done when:** F1-R12, F1-R13, F1-R14.
- **Commit:** `fix(M1): validação por campo no login, cadastro e recuperação`

### T7 [P] — Orçamento utilizável (M2)
- **What:** prefixo R$, `inputMode="decimal"`, vírgula decimal, mínimo 0, foco visível; gasto × planejado por categoria com `calcSpentByCategory`; erro único e que some ao trocar de tela.
- **Where:** `App.tsx` `BudgetPanel` (~834–900), `lib/budget.ts`, `index.css`.
- **Done when:** F1-R15, F1-R16, F1-R17.
- **Commit:** `fix(M2): orçamento com R$, validação e gasto por categoria`

### T8 [P] — Semana e marcos (M5)
- **What:** `calcGestationalWeek` com `floor` + dias e testes (`lib/gestation.test.ts`, novo); estado "atrasado" para marco de semana passada não concluído; `getNextMilestone` deixa de pular atrasados; aviso "a chegada pode ser a qualquer momento" com link para o perfil.
- **Where:** `lib/gestation.ts`, `App.tsx` (TimelinePanel, Overview, Profile), `index.css`.
- **Done when:** F1-R18, F1-R19, F1-R20.
- **Gate:** `pnpm --filter @workspace/ninho run test`
- **Commit:** `fix(M5): semana em dias, trava em 40 e marcos atrasados`

### T9 — Desfazer e confirmar (M13)
- **Depends on:** T1 (diálogo de confirmação), T2 (aviso da lista).
- **What:** remover item sem `window.confirm`, com "Desfazer" por 5s (recria o item pelo POST); diálogo de confirmação em "revogar link" e "gerar novo link".
- **Where:** `App.tsx` (handleDelete ~1886, painel de compartilhamento ~952).
- **Done when:** F1-R21, F1-R22.
- **Commit:** `fix(M13): desfazer na remoção e confirmação ao revogar link`

### T10 — Perfil e mensagens (M14, B1)
- **What:** perfil sempre editável com "salvar" condicional e uma confirmação só; alinhamento do card de presentes; 404 e ErrorBoundary em pt-BR; `meta description` real; mapa de mensagens amigáveis por status no lugar de "HTTP 400".
- **Where:** `App.tsx` `ProfilePanel`, `pages/not-found.tsx`, `components/error-boundary.tsx`, `index.html`, `index.css`.
- **Done when:** F1-R23, F1-R24, F1-R25.
- **Commit:** `fix(M14,B1): perfil sempre editável e mensagens em português`

### T11 — Validação da fase e docs
- **What:** gates completos; os 8 critérios de aceite no navegador (375 e 1280), incluindo teclado; atualizar spec, STATE, ROADMAP e SUMMARY.
- **Commit:** `docs: fecha Fase 1`

## Status

| Tarefa | Status | Commit |
|---|---|---|
| T1 | concluído | 44e120c |
| T2 | concluído | 44e120c |
| T3 | concluído | 44e120c |
| T4 | concluído | 44e120c |
| T5 | concluído | 85406e8 |
| T6 | concluído | 85406e8 |
| T7 | concluído | 3f225e3 |
| T8 | concluído | 133721a |
| T9 | concluído | 3f225e3 |
| T10 | concluído | 3f225e3 |
| T11 | concluído | (este commit) |
