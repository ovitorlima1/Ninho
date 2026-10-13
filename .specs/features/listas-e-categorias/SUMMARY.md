# Listas e categorias do Enxoval — resumo

Na main pelo PR #12 e no ar desde 2026-10-13. Spec: LC-R1 a LC-R30, todos atendidos.

## O que mudou para a mãe

- **Sugestões às claras.** Os itens que vêm de um modelo mostram a etiqueta "Sugestão" até ela mexer (nome,
  quantidade, preço, categoria ou status). Um aviso manteiga no topo explica que são um ponto de partida e que
  quantidades e preços são estimativas; "entendi" fecha de vez, em todos os aparelhos.
- **Categorias livres.** "+ categoria" no fim da fila (nome e ícone; a cor é automática). O lápis no cartão renomeia,
  troca o ícone e exclui: com itens, ela escolhe mover para outra categoria ou apagar junto. Cada categoria tem uma
  linha no Orçamento.
- **Várias listas.** Fichas no topo da aba Enxoval com "nova lista" por modelo (Mala da maternidade, Quarto do bebê,
  Enxoval do bebê, em branco). Renomear e excluir pelo lápis ao lado do nome. O aparelho lembra a lista aberta.
- **Reflexos.** O título da tela passa a ser o nome da lista ("Enxoval do bebê"). Com mais de uma lista, o Orçamento
  agrupa por lista, o Início mostra "Por lista" e o Perfil diz qual lista o link público mostra (a primeira).

## Como foi feito

- Banco: `checklists`, `checklist_categories` (com `planned`) e `list_id`, `category_id`, `suggested` em
  `checklist_items`. Só acréscimos; conferido com `push` sem `--force` numa cópia do banco de dev.
- Contas antigas: `backfillLegacyChecklists()` roda ao subir a API (`index.ts`) e `GET /workspace` migra por conta
  como garantia. Regra pura em `checklist-rules.ts` (`planLegacyMigration`, `looksUntouched`).
- Rotas novas em `routes/checklists.ts`; item e orçamento passam a usar `categoryId`.
- Front: `lib/checklists.ts`, `features/checklist/list-modals.tsx`, `ChecklistPanel` com seletor, aviso e etiqueta;
  `CategoryBadge` lê ícone e cor da categoria.

## Verificação

- `pnpm run typecheck`, `pnpm lint`, build de produção: verdes.
- Unitários: 98 (48 no front, 50 na API): 8 casos novos de regra na API, 6 em `checklists.test.ts` no front, e os de
  orçamento e de busca reescritos para categoria por id.
- E2E: 108/108 (54 cenários × celular e computador), 9 cenários novos em `checklists.spec.ts`, axe sem violação
  séria nas telas e nos diálogos novos.
- Capturas conferidas em 375, 834, 1024 e 1280px.

## Deploy (2026-10-13)

- Backup do banco logo antes (`ninho-20261013-141636.sql.gz`, no volume `ninho_pgbackups`).
- O `migrate` aplicou o schema e terminou com "Exited (0)"; a API registrou "Legacy checklists migrated" com 3 contas.
- Antes e depois: 3 contas, 30 itens e R$ 7.242,00 planejados (12 linhas de orçamento viraram 12 categorias).
  Depois: 3 listas "Enxoval do bebê", nenhum item sem lista ou categoria, 25 itens com a etiqueta "Sugestão" e
  `budget_categories` vazia.
- `api`, `web`, `postgres` e `pgbackups` saudáveis; `/api/healthz` e a página respondendo 200 de fora.
- Não conferido: entrar com uma conta real em produção e abrir a Lista.

## Ainda vale o dono olhar

- Os itens dos modelos novos (Mala da maternidade, Quarto do bebê) são uma curadoria inicial: a tabela "Modelos de
  lista" da spec.
- As decisões assumidas na spec (nome "Enxoval do bebê", link público e inspirações na primeira lista, cor
  automática da categoria).

## Fica para depois

Mover item entre listas, reordenar listas e categorias, escolher a cor da categoria, compartilhar outra lista pelo
link público, "apagar as sugestões que não mexi" e remover a tabela `budget_categories` (vazia).
