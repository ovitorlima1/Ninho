# Design técnico — listas e categorias do Enxoval

Spec: `spec.md` (LC-R1 a LC-R30).

## Restrição que molda tudo

A produção aplica o schema com `drizzle-kit push`, sem terminal (`deploy/Dockerfile`, alvo `migrate`): ele cria tabela e
coluna, mas **não roda script de dados** e para se tiver de apagar algo. Então:

- o schema só **acrescenta** (LC-R30): duas tabelas e três colunas em `checklist_items`, duas delas anuláveis;
- a passagem dos dados antigos para o modelo novo é feita **pela API**, ao subir (LC-R26), e de novo por conta no
  `GET /workspace` como rede de segurança;
- `budget_categories` continua no schema, sem uso: a migração leva o planejado para a categoria e apaga as linhas da
  conta. Tirar a tabela fica para uma limpeza futura, feita à mão na VPS.

## Banco (`lib/db/src/schema/checklists.ts`, novo)

```
checklists
  id serial pk · user_id text · name text · suggestions_notice_dismissed boolean default false
  sort_order integer default 0 · created_at · updated_at            índice: user_id

checklist_categories
  id serial pk · user_id text · list_id integer · name text
  icon text default 'heart' · tone text default 'lilac'
  planned numeric(10,2) default 0 · sort_order integer default 0 · created_at · updated_at   índice: list_id

checklist_items (colunas novas)
  list_id integer NULL · category_id integer NULL · suggested boolean NOT NULL default false
```

- `checklist_items.category` (texto) continua obrigatória e passa a ser o **nome da categoria, mantido pelo servidor**
  (gravado ao criar, mover e renomear). É o que o link público, a exportação e a regra de vínculo de inspiração já leem.
- Sem foreign keys, como no resto do banco: o vínculo é conferido na rota, sempre com `user_id` no `where` (LC-R27).
- Constantes: `CHECKLIST_TEMPLATES`, `CATEGORY_ICONS` (8), `CATEGORY_TONES` (4), `MAX_CHECKLISTS = 10`,
  `MAX_CHECKLIST_CATEGORIES = 12`, `DEFAULT_CHECKLIST_NAME = "Enxoval do bebê"`.
- `ITEM_CATEGORIES` fica: são os nomes das quatro categorias do modelo e das inspirações.

## Regras puras (`artifacts/api-server/src/lib/checklist-rules.ts`, com teste)

| Função | Para quê |
|---|---|
| `normalizeName(text)` | sem acento, sem caixa, espaços colapsados — base da unicidade (LC-R8) e do casamento com inspiração (LC-R25) |
| `isNameTaken(name, existing, exceptId?)` | recusa de nome repetido |
| `nextTone(count)` | rodízio de cor |
| `looksUntouched(item)` | item igual ao do modelo e "A comprar" → sugestão na migração (decisão 10) |
| `planLegacyMigration(items, budget)` | categorias a criar (as 4 + qualquer nome que exista nos itens ou no orçamento), com o planejado, e a marca de sugestão por item |
| `clearsSuggestion(patch)` | PATCH que mexe em nome, quantidade, preço, categoria ou status (LC-R4) |

Modelos em `lib/checklist-templates.ts` (o do enxoval é o `DEFAULT_ITEMS` + `DEFAULT_BUDGET` de hoje, que saem do `seed.ts`).

## Acesso ao banco (`lib/checklist-store.ts`)

- `createChecklistFromTemplate(tx, userId, template, name)` — lista, categorias e itens (`suggested: true`); usado no
  cadastro e em "nova lista".
- `migrateLegacyUser(userId)` — transação com `pg_advisory_xact_lock(hashtext(userId))`; sai sem fazer nada se a conta
  já tem lista. Cria "Enxoval do bebê", as categorias do plano, preenche `list_id`/`category_id`/`suggested` dos itens
  e apaga as linhas de `budget_categories` da conta.
- `backfillLegacyChecklists()` — para cada perfil sem lista, `migrateLegacyUser`. Chamado no `index.ts` antes do
  `listen`; se falhar, registra o erro e a API sobe (a rede de segurança por conta cobre).
- `primaryChecklist(executor, userId)` — a primeira lista (`sort_order`, `id`): link público e inspirações.

## API

| Rota | Mudança |
|---|---|
| `GET /api/me/workspace` | devolve `lists` e `categories`; itens com `listId`, `categoryId`, `suggested`; sai `budget` |
| `POST /api/me/checklist` | `categoryId` no lugar de `category`. Com `recommendationId`, o servidor escolhe (ou recria) a categoria na primeira lista |
| `PATCH /api/me/checklist/:id` | aceita `categoryId` (da mesma lista do item); zera `suggested` conforme `clearsSuggestion` |
| `PUT /api/me/budget` | `{ categories: [{ categoryId, planned }] }`; ids que não são da conta → 400; devolve as categorias |
| `POST /api/me/checklists` | `{ template, name }` → `{ list, categories, items }`; 409 no limite |
| `PATCH /api/me/checklists/:id` | `{ name?, suggestionsNoticeDismissed? }` |
| `DELETE /api/me/checklists/:id` | apaga lista, categorias, itens e reservas desses itens; 409 se é a única |
| `POST /api/me/checklists/:id/categories` | `{ name, icon }`; 409 nome repetido ou limite |
| `PATCH /api/me/checklist-categories/:id` | `{ name?, icon? }`; renomear atualiza `checklist_items.category` na mesma transação |
| `DELETE /api/me/checklist-categories/:id` | `?moveTo=<id>` move os itens; `?items=delete` apaga junto; com itens e sem nenhum dos dois → 409 com a contagem; única da lista → 409 |
| `GET /api/gift/:token` e `POST …/reservations` | só itens da primeira lista; o item público ganha `categoryIcon` |
| `GET /api/me/export` | + `checklists`, `checklistCategories` (com `planned`); sai `budget` |
| `DELETE /api/me/account` | + as duas tabelas novas |

Rotas novas em `routes/checklists.ts`, montado em `/me` antes do `meRouter`. Mensagens em pt-BR.

## Frontend

- **Tipos** (`lib/api.ts`): `ServerChecklist`, `ServerCategory`; `Workspace` com `lists` e `categories`. Sai o tipo
  `CategoryKey` (união dos quatro nomes): categoria passa a ser objeto com `id`.
- **Regras puras** (`lib/checklists.ts`, com teste): categorias de uma lista, progresso por lista, aviso visível
  (LC-R1, LC-R6), busca dentro da lista (LC-R18), nome repetido.
- **Lista aberta**: estado no `useWorkspace`, lembrado em `localStorage` por conta (com `try/catch`); cai na primeira
  lista se o id guardado não existe mais.
- **`ChecklistPanel`**: seletor de listas + "nova lista", cabeçalho da lista com "editar lista", aviso de sugestões,
  fila de categorias com "+ categoria", cartão da categoria com "editar categoria", etiqueta "Sugestão" na linha.
  Recebe `key={lista}` para a categoria escolhida e a busca recomeçarem ao trocar de lista.
- **Diálogos** (`features/checklist/list-modals.tsx`): `CreateChecklistModal` (mesmo desenho de `CreateListModal` dos
  presentes: `choice-list`), `EditChecklistModal` (renomear + excluir), `CategoryModal` (criar/editar, ícones) e
  `DeleteCategoryDialog` (mover ou apagar junto).
- **`CategoryBadge`/`CategoryIcon`**: recebem `icon` e `tone`; nome sozinho continua aceito para as inspirações.
- **Orçamento**: linhas vêm de `categories`; grupo por lista quando há mais de uma; salva por `categoryId`.
- **Início**: planejado = soma de `categories.planned`; "Por categoria" ou "Por lista".
- **Inspirações**: os filtros continuam sendo os quatro nomes fixos do catálogo; o casamento com item da lista usa
  `normalizeName`.
- **CSS**: `list-switcher`, `suggestion-notice`, `badge-lilac`, `pill-add`, `icon-picker`, `budget-group-title` —
  só tokens que já existem; nada de cor ou fonte nova.

## Riscos

| Risco | Tratamento |
|---|---|
| Link público aberto por um convidado logo depois do deploy, antes de a dona entrar | a migração roda para todas as contas ao subir, antes do `listen` |
| Duas abas da mesma conta disparando a migração | trava por conta + checagem "já tem lista" dentro da transação |
| Front antigo em cache falando com a API nova (`category` em vez de `categoryId`) | a API aceita `category` (nome) como alternativa ao criar item, resolvendo na primeira lista |
| Excluir categoria apaga item sem querer | o servidor exige a escolha explícita (`moveTo` ou `items=delete`) |
