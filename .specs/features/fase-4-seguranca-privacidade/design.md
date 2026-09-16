# Fase 4 — Design

## 1. Tabelas novas (`lib/db/src/schema/authUsers.ts`)

```ts
auth_sessions (
  id           text primary key,          -- 32 bytes aleatórios, base64url
  user_id      text not null,             -- índice
  created_at   timestamp not null default now(),
  last_seen_at timestamp not null default now(),
  expires_at   timestamp not null,
  revoked_at   timestamp                  -- null = ativa
)

auth_attempts (
  key               text primary key,     -- "escopo:hash"
  count             integer not null,
  window_started_at timestamp not null,
  blocked_until     timestamp
)
```

Sem dado pessoal em claro: nenhuma das duas guarda e-mail, IP ou user-agent.

## 2. Sessões

- JWT ganha `sid`. `createSession(userId)` insere a sessão e devolve o token.
- Implementação: `api-server/src/lib/sessions.ts` (`createSession`, `resolveSession`,
  `revokeCurrentSession`, `revokeAllSessions`); rotas da conta em `routes/account.ts`.
- `requireAuth` (e `GET /api/auth/session`): verifica assinatura → busca sessão + conta num
  `SELECT` com join → recusa se não existir, se `revoked_at` estiver preenchido, se
  `expires_at` passou ou se `session_version` não bate.
- `last_seen_at` é atualizado no máximo uma vez a cada 15 min por sessão (evita escrita a cada
  requisição).
- `logout`: `UPDATE ... SET revoked_at = now() WHERE id = sid`.
- `revoke-all` e redefinição de senha: incrementam `session_version` **e** revogam todas as
  sessões da conta.
- Tokens antigos sem `sid`: `verifySessionToken` devolve `null` → 401 → o front leva ao login
  com aviso (tratamento da Fase 1).

## 3. Limitador persistente

Uma função pura decide o próximo estado, testada com Vitest:

```ts
nextAttempt(prev: { count, windowStartedAt, blockedUntil } | null, now, { windowMs, blockMs, max })
  → { allowed, retryAfterSeconds, next }
```

A persistência usa uma transação com `SELECT ... FOR UPDATE` na chave (ou `INSERT` quando não
existe), aplica `nextAttempt` e grava. Chave = `${escopo}:${hmacSha256(SESSION_SECRET, valor)}`.
`release(keys)` apaga as chaves (login certo). Limpeza: a cada ~100 chamadas, apaga linhas cujo
`window_started_at` e `blocked_until` são mais antigos que 1 dia.

A classe em memória sai; os testes da Fase 0 passam a testar a regra pura com as mesmas
configurações exportadas. Na implementação a regra se chama `consumeAttempts` e fica em
`lib/attempts.ts` (sem banco, para o Vitest não precisar de `DATABASE_URL`); a persistência
fica em `lib/rate-limit.ts`. Um bloqueio só termina em `blockedUntil` (o limitador antigo o
encerrava junto com a janela).

## 4. Endurecimento HTTP (`api-server/src/middlewares/security.ts`)

- `securityHeaders` (lista de F4-R8) e `noStore` em `/api/me` e `/api/auth`.
- `app.disable("x-powered-by")`, `express.json({ limit: "64kb" })`, sem `urlencoded`.
- `requireSameOrigin` em métodos que alteram dados. Regra pura `isAllowedOrigin(origin, host,
  secFetchSite, env)`:
  - sem `Origin`: permitido, exceto se `Sec-Fetch-Site: cross-site`;
  - `Origin` com o mesmo host da requisição (`req.hostname`, que respeita o proxy confiável): permitido;
  - `Origin` igual a `PUBLIC_APP_URL` ou a um item de `ALLOWED_ORIGINS`: permitido;
  - fora de produção, `http://localhost:*` e `http://127.0.0.1:*`: permitido (proxy do Vite troca o `Host`);
  - resto: 403 `{ error: "Origem não permitida." }`.
- Tratador de erro final: `SyntaxError` do body-parser → 400 "Não conseguimos ler os dados
  enviados."; o resto → 500 genérico, com `req.log.error`.
- CSP por meta no `index.html`:
  `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';
  base-uri 'self'; form-action 'self'; object-src 'none'`.
  O Vite de desenvolvimento injeta scripts inline — a meta só entra no build (plugin
  `transformIndexHtml` com `apply: "build"`). `frame-ancestors` não funciona por meta; fica
  anotado como limite do deploy estático.

## 5. Logs e validação

- `logger`: serializador de erro próprio. O `DrizzleQueryError` repete os valores na mensagem e
  no stack (`params: …`), então só `redact` não basta; o texto da consulta (sem valores) fica.
- `console.error` → `req.log.error({ err }, ...)` em `me.ts`.
- Schemas ficam em `lib/db/src/schema/authUsers.ts`, junto dos outros (a API não depende de zod).
- Zod para `register`, `login`, `password-reset/request`, `password-reset/complete`,
  `account delete`; mensagens em pt-BR.
- `upsertBudgetSchema`: `z.array(...).max(4)` e `category: z.enum(ITEM_CATEGORIES)`.
- Login com conta inexistente: `verifyPassword(password, DUMMY_HASH)`; cadastro com e-mail
  existente: `hashPassword(password)` antes de responder.
- `PasswordResetPage`: lê o token e chama `history.replaceState` sem a query.

## 6. LGPD

- `GET /api/me/export`: `Content-Disposition: attachment; filename="ninho-meus-dados-AAAA-MM-DD.json"`,
  `Cache-Control: no-store`. Conteúdo com `exportedAt`, `account { email, createdAt }`,
  `profile`, `items`, `milestones`, `budget`, `giftShare { active, createdAt }` (sem token),
  `giftReservations`.
- `DELETE /api/me/account` body `{ password, confirmation: "EXCLUIR" }` → limitador → confere
  senha → transação apagando de: `checklist_items`, `milestones`, `budget_categories`,
  `gift_reservations`, `gift_share_links`, `profiles`, `password_reset_tokens`,
  `auth_sessions`, `auth_users` → cookie expirado → 204.
- Front: seção "Sua conta" no Perfil — sair deste aparelho, sair de todos (ConfirmDialog),
  exportar (link com `download`), excluir (diálogo com campo de senha e campo "digite EXCLUIR";
  botão só habilita com a palavra certa).

## 7. Testes

| Tipo | Cobertura |
|---|---|
| Vitest (API) | `nextAttempt`; `isAllowedOrigin`; schemas Zod de acesso e orçamento |
| E2E | sair revoga o token; sair de todos derruba outro contexto; cabeçalhos e 403 por origem; exportação; exclusão com senha errada e certa (com contagem de linhas no banco); chaves em hash em `auth_attempts` |

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Todo mundo é deslogado no deploy (tokens sem `sid`) | Esperado e documentado; o front já leva ao login com aviso |
| `SELECT ... FOR UPDATE` no limitador sob carga | Uma linha por chave; transação curta |
| CSP quebra algo no build | E2E roda contra o Vite de dev (sem a meta); conferir o build com `vite preview` antes de fechar |
| Origin check bloqueia o próprio app em produção | Mesmo host passa; `PUBLIC_APP_URL` e `ALLOWED_ORIGINS` como escape |
