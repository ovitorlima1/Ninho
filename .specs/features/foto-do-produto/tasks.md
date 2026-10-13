# Tarefas — foto do produto

Gates de todo commit: `pnpm run typecheck`, `pnpm lint`, `pnpm test`. E2E (`pnpm test:e2e`) e a imagem Docker fecham a feature.

| # | Tarefa | Onde | Requisitos | Pronto quando | Status |
|---|---|---|---|---|---|
| T1 | Schema: `media_files` e `photo_key` nos dois itens | `lib/db/src/schema` | FP-R21 | `push` sem `--force` aplica | pendente |
| T2 | Tratamento da imagem e regras puras, com testes | `api-server/src/lib/photo.ts`, `media-rules.ts` | FP-R2, R3, R15, R18 | testes cobrem redução, orientação, metadados apagados e recusas | pendente |
| T3 | Guardar, apagar e limpar fotos; rota pública | `lib/media-store.ts`, `routes/media.ts`, `index.ts` | FP-R10, R12 a R14, R18 | foto servida com cache; órfã some na limpeza | pendente |
| T4 | Rotas de envio e remoção (Enxoval e presentes), Desfazer, páginas públicas, exportação e exclusão de conta | `routes/me.ts`, `lists.ts`, `lists-public.ts`, `gift.ts`, `account.ts` | FP-R1, R5, R13 a R17, R19 | item de outra conta → 404; não-imagem → 400 | pendente |
| T5 | Front: regras puras, cliente, `PhotoField` e `ItemPhoto` | `ninho/src/lib`, `components` | FP-R3, R4, R8, R9 | testes das regras; prévia funciona | pendente |
| T6 | Enxoval: diálogos, linha do item e página pública do Perfil | `features/checklist`, `workspace`, `gift` | FP-R1, R4, R5, R7 | aceites 1 e 2 | pendente |
| T7 | Presentes: diálogo, lista da mãe e página do convidado | `features/gift-lists` | FP-R1, R5, R6 | aceite 3 | pendente |
| T8 | Deploy: Dockerfile, compose, Nginx, política de imagens, roteiro | `deploy/`, `vite.config.ts` | FP-R10, R11, R21 | imagem `api` construída e um envio de verdade feito nela | pendente |
| T9 | E2E e verificação visual | `ninho/e2e/photos.spec.ts` | FP-R20, aceites 1 a 6 | suíte verde nos dois projetos; capturas conferidas | pendente |
| T10 | Documentação | `.specs/` | — | SUMMARY, ROADMAP, STATE e a spec de presentes atualizados | pendente |

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10.
