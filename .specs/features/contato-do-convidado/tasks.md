# Tarefas — nome e telefone do convidado

Gates de todo commit: `pnpm run typecheck`, `pnpm lint`, `pnpm test`. E2E (`pnpm test:e2e`) fecha a feature.

| # | Tarefa | Onde | Requisitos | Pronto quando | Status |
|---|---|---|---|---|---|
| T1 | Regra do telefone (pura, com testes) e colunas novas | `lib/db/src/schema/phone.ts`, `giftSharing.ts`, `giftLists.ts` | CC-R3, R4, R6 | testes cobrem celular, fixo, `+55`, máscara, DDD com zero, curto e longo; `push` sem `--force` aplica | feito |
| T2 | Rotas públicas: exigir e gravar, esconder nome, nunca devolver telefone | `api-server/src/routes/gift.ts`, `lists-public.ts` | CC-R5, R9, R10, R12–R14 | 400 sem nome ou telefone; resposta pública sem telefone | feito |
| T3 | Front: regra do telefone, `ContactFields`, armazenamento no aparelho | `ninho/src/lib/phone.ts`, `components/contact-fields.tsx`, `features/gift` | CC-R3, R4, R7, R8, R18 | testes das regras; tela com erro em texto | feito |
| T4 | Formulários: Presentes e Enxoval, página pública do Enxoval | `features/gift-lists/public`, `features/gift` | CC-R1, R2, R12 | aceites 1, 2 e 6 | feito |
| T5 | Telas da mãe: telefone e WhatsApp | `features/gift-lists/list-modals.tsx`, `features/checklist/checklist-panel.tsx`, `lib/*api.ts` | CC-R15–R17 | aceite 1 e 2 (lado da mãe) | feito |
| T6 | Atualizar E2E existentes e escrever os novos | `ninho/e2e/*.spec.ts` | CC-R9, R11, aceites 1–6 | suíte verde nos dois projetos | feito |
| T7 | Documentação | `.specs/` | — | SUMMARY, ROADMAP, STATE; LP-R20 e LP-R32 revisadas na spec de presentes | feito |

Commits: `2707558` (docs), `337abae` (T1), `55b9abe` (T2), `8527dc7` (T3), `1ffde4a` (T4), `fe2c069` (T5),
`6650adc` (T6), `5f7cdbc` (correção do texto do interruptor).

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7.
