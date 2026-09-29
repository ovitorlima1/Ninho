# Design — verificação de e-mail

## Banco (`lib/db/src/schema/authUsers.ts`)

- `auth_users.email_verified_at timestamp` **nulo permitido, `DEFAULT now()`**. O `drizzle-kit push` adiciona a
  coluna com o default, então as contas existentes nascem confirmadas (EV-R8) sem script de migração. O cadastro
  grava `null` explicitamente.
- Tabela nova `email_verification_tokens`: `id`, `user_id`, `token_hash` (único), `password_hash` (a senha daquele
  cadastro, EV-R4), `expires_at`, `used_at`, `created_at`; índice por `user_id`.

## API (`routes/auth.ts`)

| Rota | Comportamento |
|---|---|
| `POST /register` | valida; limite atual; faz o hash da senha sempre; conta confirmada → e-mail "já tem conta"; não confirmada → token novo com este hash; nova → cria conta (`email_verified_at: null`) + token. Sempre `202 { message }` após tempo mínimo de 400 ms. Envio *fire-and-forget* com `.catch` logado. |
| `POST /verify-email` `{ token }` | transação: marca o token usado (não usado, não vencido); define `email_verified_at` e `password_hash` do token; marca os outros tokens da conta como usados. Fora da transação: `initializeUser`, sessão, cookie. `200 { user }` ou `400` genérico. |
| `POST /verify-email/resend` `{ email }` | limites próprios (3/h por e-mail, 10/h por origem); conta não confirmada → token novo com o hash atual da conta. Sempre `202` genérico após tempo mínimo. |
| `POST /login` | senha certa + conta não confirmada → `403 { error, code: "email_not_verified" }`; resto igual. |
| `POST /password-reset/complete` | também grava `email_verified_at` se estiver nulo. |

Tokens: reutiliza `createPasswordResetToken`/`hashPasswordResetToken` (renomeados para `createOpaqueToken`/`hashOpaqueToken`).

## E-mail (`lib/email.ts`)

`sendEmail({ to, subject, text, html })` com transporte por `EMAIL_TRANSPORT`:
`resend` (padrão), `log` (só o assunto e o link vão para o log, fora de produção) e `outbox` (grava JSON em
`EMAIL_OUTBOX_DIR`, fora de produção). Em produção, qualquer valor diferente de `resend` lança erro.
Mensagens: confirmação, "você já tem conta" e redefinição (a atual), com a paleta ameixa do app.

## Front

- `AuthPage` (cadastro): sucesso → cartão "Confira seu e-mail" com o endereço, "reenviar e-mail" e "voltar para entrar".
- `AuthPage` (login): erro com `code === "email_not_verified"` → mensagem + botão "reenviar link de confirmação".
- `VerifyEmailPage` em `/verify-email`: tira o token da URL (`replaceState`), confirma, guarda a sessão e vai para
  `/dashboard` (onboarding). Erro → cartão com campo de e-mail para pedir outro link.
- `api.ts`: `register` passa a devolver `{ message }`; `verifyEmail`, `resendVerification`.

## E2E

- `e2e/env.ts`: `E2E_OUTBOX_DIR` (pasta temporária); `playwright.config.ts` passa `EMAIL_TRANSPORT=outbox`,
  `EMAIL_OUTBOX_DIR` e `PUBLIC_APP_URL=https://ninho.test` para a API; `global-setup` limpa a pasta.
- `e2e/mail.ts`: `latestEmail(to)` espera o arquivo do destinatário; `linkFrom(email)` tira o token.
- `createAccount` passa a confirmar pelo link antes de seguir.
