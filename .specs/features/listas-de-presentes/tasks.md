# Tarefas — listas de presentes, E1

| # | Tarefa | Onde | Pronto quando | Req. |
|---|---|---|---|---|
| T1 | Tabelas e validações | `lib/db/src/schema/giftLists.ts` | push no banco de teste | base |
| T2 | Regra de saldo e Pix (puras) | `api-server/src/lib/gift-rules.ts`, `pix.ts` + testes | testes verdes; CRC conferido | LP-R19, R21, R22, R24–R27 |
| T3 | API da mãe: listas, itens, Pix, promessas | `routes/lists.ts`, `lib/gift-templates.ts` | typecheck; E2E da T8 | LP-R2–R14, R29–R31 |
| T4 | API pública: ler, prometer, consultar, cancelar | `routes/lists-public.ts` | typecheck; E2E da T8 | LP-R15–R28, R32 |
| T5 | Exportar e excluir conta com os dados novos | `routes/account.ts` | E2E de conta verde | LP-R14 |
| T6 | Front: aba Presentes, minhas listas, detalhe, modais | `features/gift-lists/*`, `layout/app-shell.tsx`, `lib/api.ts`, CSS | capturas 390/1280 | LP-R1–R14, R29–R31 |
| T7 | Front: página do convidado | `features/gift-lists/public/*`, `app/router.tsx`, `components/pix-code.tsx` | capturas 390/1280 | LP-R15–R28 |
| T8 | E2E dos caminhos da spec + axe | `e2e/gift-lists.spec.ts` | critérios de aceite 1–4 | todos |
| T9 | Docs, diagnóstico e PR | — | tudo verde; PR aberto | — |
