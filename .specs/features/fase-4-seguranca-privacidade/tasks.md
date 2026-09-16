# Tarefas — Fase 4

```
T1 tabelas ──► T2 sessões ──► T3 limitador persistente ──► T5 validação e logs ──► T6 LGPD ──► T7 validação
                     T4 endurecimento HTTP [P] (app.ts, middleware novo, index.html) ───────┘
```

T2, T3, T5 e T6 mexem em `routes/auth.ts` e `routes/me.ts`: sequenciais. T4 mexe em arquivos
próprios; acabou feita em sequência pelo orquestrador (pequena, e o E2E compartilha portas).

---

### T1 — Tabelas de sessão e de tentativas
- **Where:** `lib/db/src/schema/authUsers.ts` (+ export no index); `push-force` no banco de dev e no de teste.
- **Done when:** tabelas criadas; typecheck verde.
- **Commit:** `feat(M10): tabelas auth_sessions e auth_attempts`

### T2 — Sessões revogáveis
- **What:** `sid` no JWT; `createSession`; `requireAuth` e `/session` checam a sessão; `logout` revoga; `POST /api/me/sessions/revoke-all`; redefinição de senha revoga todas; front com "sair deste aparelho" e "sair de todos".
- **Done when:** F4-R1–R4; E2E de token reutilizado e de sair de todos.
- **Commit:** `feat(M10): sair revoga a sessão, e sair de todos os aparelhos`

### T3 — Limitador no Postgres
- **What:** `nextAttempt` puro + camada persistente; chaves em HMAC; limpeza; troca em login, cadastro, recuperação; novos limites em reserva de presente (e exclusão, usado no T6).
- **Done when:** F4-R5–R7; Vitest do `nextAttempt`; E2E do limite de recuperação continua verde; linhas em hash no banco.
- **Commit:** `feat(A9): limites de tentativa persistidos no Postgres`

### T4 [P] — Endurecimento HTTP
- **What:** `middlewares/security.ts` (cabeçalhos, no-store, mesma origem), `x-powered-by` off, só JSON com limite, tratador de erro JSON, CSP por meta só no build.
- **Where:** `artifacts/api-server/src/app.ts`, `src/middlewares/security.ts` (+ teste), `artifacts/ninho/vite.config.ts`, `artifacts/ninho/index.html`.
- **Done when:** F4-R8–R11; Vitest do `isAllowedOrigin`; E2E de cabeçalhos e 403.
- **Commit:** `feat(M10): cabeçalhos de segurança, só JSON e bloqueio de outras origens`

### T5 — Validação, logs e enumeração
- **What:** Zod nas rotas de acesso; limites do orçamento; `req.log` + redação de parâmetros; mensagens em pt-BR; hash fictício no login e hash no cadastro repetido; token fora da URL.
- **Done when:** F4-R12–R15; nenhum `console.*` e nenhuma mensagem em inglês na API.
- **Commit:** `fix(M10,B4): validação com Zod, logs sem dados pessoais e sem enumeração por tempo`

### T6 — Exportar dados e excluir conta
- **What:** `GET /api/me/export`, `DELETE /api/me/account`, seção "Sua conta" no Perfil.
- **Done when:** F4-R16–R18; E2E de exportação e de exclusão (com contagem de linhas).
- **Commit:** `feat(LGPD): exportar meus dados e excluir minha conta`

### T7 — Validação e docs
- **What:** critérios de aceite; conferir o build com a CSP (`vite preview`); SUMMARY, STATE, ROADMAP, CONCERNS, TESTING e `replit.md`.
- **Commit:** `docs: fecha Fase 4`

## Status

| Tarefa | Status | Commit |
|---|---|---|
| T1 | concluído | 1d7d16a |
| T2 | concluído | 7247faa |
| T3 | concluído | 11bae31 |
| T4 | concluído | 22523ab |
| T5 | concluído | b15a4d7 |
| T6 | concluído | 4f9b185 |
| T7 | concluído | este commit |
