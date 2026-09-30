# Tarefas — verificação de e-mail

| # | Tarefa | Onde | Pronto quando | Req. |
|---|---|---|---|---|
| T1 | Coluna `email_verified_at` e tabela `email_verification_tokens` | `lib/db/src/schema/authUsers.ts` | push no banco de teste; contas antigas com data | EV-R8 |
| T2 | E-mail com transporte `resend`/`log`/`outbox` e três mensagens | `api-server/src/lib/email.ts` (+ teste) | teste do transporte; produção recusa `log`/`outbox` | EV-R10 |
| T3 | Rotas: cadastro sem sessão, confirmar, reenviar, login 403, reset confirma | `routes/auth.ts`, `lib/rate-limit.ts`, `lib/attempts.ts`, `lib/auth.ts` | typecheck; E2E da T6 | EV-R1–R8, R10 |
| T4 | Exclusão de conta apaga tokens e contadores novos | `routes/account.ts` | E2E de exclusão verde | EV-R9 |
| T5 | Front: "Confira seu e-mail", login não confirmado, página `/verify-email` | `features/auth/*`, `app/router.tsx`, `lib/api.ts`, CSS | capturas 390/1280; axe | EV-R5–R7, R11 |
| T6 | E2E: pasta de saída, `createAccount` pelo link, cenários novos | `e2e/*`, `playwright.config.ts` | 60+ E2E verdes | todos |
| T7 | Docs (.env.example, INTEGRATIONS, CONCERNS, SUMMARY), diagnóstico, PR | — | tudo verde; PR aberto | — |
