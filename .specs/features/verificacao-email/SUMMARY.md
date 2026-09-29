# Verificação de e-mail — resumo

**O que mudou**
- Cadastro não abre sessão: responde `202` com a mesma mensagem e no mesmo tempo mínimo para qualquer e-mail.
  E-mail novo ou ainda não confirmado → link de confirmação (24 h, uso único); e-mail já confirmado → aviso
  "você já tem uma conta" com links para entrar e redefinir.
- Cada link guarda o hash da senha do cadastro que o gerou; o link usado define a senha e mata os outros.
- `POST /api/auth/verify-email` confirma, prepara a lista, abre a sessão; `POST /verify-email/resend` reenvia
  (3/h por e-mail, 10/h por origem). Login com senha certa e e-mail não confirmado → `403 email_not_verified`.
- Redefinir a senha pelo link também confirma a conta e invalida links de confirmação antigos.
- Contas anteriores ficam confirmadas: `email_verified_at` entrou com `DEFAULT now()` (948 de 948 no banco de teste).
- E-mail com transporte `resend` | `log` | `outbox`; mensagens na paleta ameixa.
- Telas: "Confira seu e-mail", aviso + reenvio no login, `/verify-email` (confirmando / link inválido com pedido de outro).

**Verificação:** lint, typecheck, 32 testes do front, 22 da API (5 novos do e-mail), builds e 70/70 E2E
(5 cenários novos em `verify-email.spec.ts`; todas as contas de teste passam pelo link). Sem rolagem lateral em 320, 390 e 1280px.

**Para produção:** o envio pelo Resend precisa estar configurado (`RESEND_FROM_EMAIL`, `PUBLIC_APP_URL`) **antes**
deste deploy, senão ninguém termina o cadastro. O push do schema adiciona a coluna e a tabela sem apagar nada.

**Pendências anotadas:** limpeza de contas nunca confirmadas (CONCERNS).
