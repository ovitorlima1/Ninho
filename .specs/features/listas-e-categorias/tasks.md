# Tarefas — listas e categorias do Enxoval

Gates de todo commit: `pnpm run typecheck`, `pnpm lint`, `pnpm test`. E2E (`pnpm test:e2e`) fecha a feature.

| # | Tarefa | Onde | Requisitos | Pronto quando | Status |
|---|---|---|---|---|---|
| T1 | Schema: `checklists`, `checklist_categories`, colunas novas em `checklist_items`, schemas Zod | `lib/db/src/schema` | LC-R30 | `push-force` aplica num banco com dados antigos sem apagar nada | pendente |
| T2 | Regras puras e modelos de lista, com testes | `api-server/src/lib/checklist-rules.ts`, `checklist-templates.ts` | LC-R4, R8, R10 (dec.), R17 | `pnpm test` cobre nome repetido, rodízio de cor, item intocado e o plano de migração | pendente |
| T3 | Cadastro pelo modelo novo, migração por conta e varredura ao subir | `lib/checklist-store.ts`, `lib/seed.ts`, `index.ts` | LC-R26 | conta antiga inserida à mão no banco de teste abre com lista, categorias e planejado certos | pendente |
| T4 | Workspace, item (criar/editar com `categoryId`, etiqueta) e orçamento por categoria | `routes/me.ts` | LC-R4, R5, R13, R25, R27 | PATCH de status zera `suggested`; orçamento recusa id de outra conta | pendente |
| T5 | Rotas de listas e categorias | `routes/checklists.ts` | LC-R7 a R12, R17, R19 a R21, R27 | limites, nome repetido, última lista/categoria e exclusão com itens respondem 409 com mensagem | pendente |
| T6 | Link público, exportação e exclusão de conta | `routes/gift.ts`, `routes/account.ts` | LC-R24, R28 | link mostra só a primeira lista; exportação traz listas e categorias | pendente |
| T7 | Front: tipos, cliente e regras puras com testes | `ninho/src/lib` | LC-R1, R6, R18 | `pnpm test` cobre aviso visível, progresso por lista e busca na lista | pendente |
| T8 | Front: telas no modelo novo (Lista, Orçamento, Início, Inspirações, diálogos de item) | `ninho/src/features`, `components/category-icon.tsx` | LC-R13 a R15, R22, R23 | tudo o que funcionava antes continua, lendo categorias do servidor | pendente |
| T9 | E1: aviso e etiqueta "Sugestão" | `checklist-panel.tsx`, CSS | LC-R1 a R6 | aceite 1 da spec | pendente |
| T10 | E2: criar, editar e excluir categoria | `list-modals.tsx`, `checklist-panel.tsx` | LC-R7 a R12 | aceite 2 da spec | pendente |
| T11 | E3: seletor de listas, criar por modelo, renomear e excluir | `list-modals.tsx`, `checklist-panel.tsx`, `use-workspace.ts` | LC-R16 a R21, R24 | aceite 3 da spec | pendente |
| T12 | E2E: ajustar os cenários afetados e escrever `checklists.spec.ts` | `ninho/e2e` | LC-R26 a R29 | suíte verde nos dois projetos, axe sem violação séria | pendente |
| T13 | Verificação visual em 375, 834, 1024 e 1280px; documentação | `.specs/` | LC-R29 | capturas conferidas; SUMMARY, ROADMAP e STATE atualizados | pendente |

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13. T2 não depende de T1.
