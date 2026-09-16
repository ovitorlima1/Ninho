# CONVENTIONS — Ninho

Convenções **observadas no código** (não há ESLint, Prettier configurado nem
`.editorconfig` — o estilo é mantido manualmente).

## Estilo geral

- Aspas duplas e ponto e vírgula em todo código escrito à mão (`App.tsx`,
  `src/lib/*`, toda a API, `lib/db`). Exceções: arquivos vindos do template
  shadcn/Replit usam aspas simples (`src/main.tsx`, `src/lib/utils.ts`,
  `vite.config.ts`, `src/components/ui/*`).
- Indentação 2 espaços, vírgula final em listas multilinha.
- Divisores de seção em ambos os lados:
  `// ─── Panels ─────────────────────────────` (`App.tsx:483`, `me.ts:32`).
- JSDoc de uma linha por rota: `/** GET /api/me/workspace — full user workspace … */`.
  Comentários explicam **por que** (ex.: `seed.ts:37-45`, `gift.ts:118-121`).

## TypeScript

- Tipos importados inline: `import { useState, type ReactNode } from "react"`.
- Props tipadas na assinatura, sem `interface` separada:
  `function Pill({ active, children }: { active?: boolean; children: ReactNode })`.
- Uniões literais em vez de enums: `type ItemStatus = "A comprar" | "Comprado" | "Ganhei"`,
  `saveState: "idle" | "saving" | "success" | "error"`.
- Constantes de domínio com `as const` + tipo derivado
  (`ITEM_STATUSES`, `RECOMMENDATION_IDS` em `lib/db/src/schema/checklistItems.ts`).
- Alias `@/` só no frontend (`tsconfig.json` + `vite.config.ts`); `@assets` aponta
  para `attached_assets`.

## React

- Componentes como `function Nome(...)` no topo do arquivo, sem `export`
  (só `App` e `NotFound` têm `export default`); nada de arrow components.
- `App.tsx` é o monólito: painéis, modais, shell desktop/mobile, páginas de auth
  e página pública convivem no mesmo arquivo (ver STRUCTURE.md).
- Mutations (todas em `Workspace`, `App.tsx:1691-1820`):
  - otimistas (checklist, marcos): `onMutate` → `cancelQueries` → `getQueryData`
    como snapshot → `setQueryData`; `onError` restaura `ctx.prev`; `onSettled`
    faz `invalidateQueries({ queryKey: wqKey })`;
  - não otimistas (perfil, orçamento, share, reservas): escrevem no cache em
    `onSuccess` via `setQueryData<Workspace>`;
  - toda mutation dá feedback em pt-BR por `showActionFeedback({ tone, message })`.
- Chaves de query sempre com escopo de usuário: `["workspace", uid]`, `["gift-share", uid]`.
- `data-testid` em todo controle interativo relevante (75 ocorrências em `App.tsx`),
  padrão `tipo-contexto-nome`: `button-phone-delete-${item.id}`,
  `input-phone-budget-${cat.toLowerCase()}`, `button-desktop-nav-perfil`,
  `budget-edit-card`.
- Acessibilidade recorrente: `aria-label` em botões só com ícone, `role="status"` /
  `role="alert"` em mensagens, `aria-busy` em cartões salvando, `aria-current="page"`.

## Copy e formatação (pt-BR)

- Toda a interface é pt-BR. Botões e ações em caixa baixa ("ver lista",
  "salvar orçamento", "vou presentear"); *kickers* em caixa alta
  (`PRÓXIMO MARCO`, `INVESTIDO ATÉ AQUI`).
- Dinheiro e datas sempre por locale: `money()` (`App.tsx:137`,
  `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`) e
  `toLocaleDateString("pt-BR", …)`.

## CSS

- Um único `src/index.css` (~1220 linhas) com CSS "puro" em classes kebab-case
  semânticas (`phone-content`, `white-card`, `recommendation-footer`,
  `public-gift-item`); Tailwind entra via `@import "tailwindcss"` e é usado
  quase só nos componentes shadcn e em `pages/not-found.tsx`.
- Modificadores de estado como classe extra: `is-reserved`, `is-current`,
  `selected`, `dot-active`.
- Tokens existem apenas para o tema shadcn (`--background`, `--primary`… em HSL)
  e para a escala tipográfica (`--type-body/-control/-meta/-label`, `index.css:1006`);
  o resto usa hex literais (437 ocorrências, 298 valores distintos).

## API (Express)

- Um `Router` por arquivo: `const router = Router(); … export default router;`.
- Handlers `async (req, res)` com early return: `res.status(400).json({...}); return;`.
- Validação com Zod v4 importado como `zod/v4`, com os schemas **morando no
  pacote de banco** (`lib/db/src/schema/*`) e consumidos por `safeParse`:
  ```ts
  const parsed = updateChecklistItemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", issues: parsed.error.issues }); return; }
  ```
  Exceção: `routes/auth.ts` valida credenciais à mão (`validateCredentials`, linha 29).
- IDs numéricos: `parseInt(req.params.id, 10)` + `isNaN` → 400 `{ error: "Invalid id" }`.
- Ownership sempre no `where`: `and(eq(t.id, id), eq(t.userId, userId))`, com
  `userId` vindo de `res.locals.userId as string`.
- Erros: sempre JSON `{ error: string }`. Mensagens ao usuário em pt-BR
  ("Não foi possível criar o link agora."), mas restos em inglês em `me.ts`
  ("Internal server error", "Item not found") — inconsistência conhecida.
- Violação de unicidade Postgres (`code === "23505"`) → 409 (`me.ts:25`, `gift.ts:20`).
- Concorrência: `db.transaction`, `.for("update")` e
  `SELECT pg_advisory_xact_lock(hashtext(${userId}))` (`me.ts:82`).
- Log: `req.log.error({ err }, "mensagem curta")` (pino por request); `gift.ts:154`
  loga só o código do erro para não reter nome de visitante. `me.ts` ainda tem 5
  `console.error` legados (linhas 53, 187, 320, 350, 383).

## Banco (`lib/db`)

- Tabelas em snake_case plural, colunas snake_case mapeadas para camelCase:
  `userId: text("user_id")`. Sem foreign keys — o vínculo é por `user_id`.
- `id` `serial`, exceto `auth_users`/`password_reset_tokens` (`text`, UUID do app).
- `createdAt`/`updatedAt` com `.notNull().defaultNow()`; `updatedAt: new Date()`
  é setado à mão nos updates.
- Dinheiro em `numeric(10,2)` → chega como **string**: API grava `String(price)`,
  frontend converte com `parseFloat` (`adaptItem`, `App.tsx:114`).
- Cada arquivo de schema exporta tabela + schemas Zod + tipos
  (`$inferSelect`/`$inferInsert`), reexportados por `src/schema/index.ts`.
