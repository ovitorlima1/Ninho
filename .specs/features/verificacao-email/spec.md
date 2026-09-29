# Verificação de e-mail no cadastro

**Tamanho:** Large (API, banco, e-mail, três telas e a base do E2E).
**Origem:** pedido do dono em 2026-09-29 — "pode seguir com a verificação de e-mail no cadastro"
(item l02 do diagnóstico: "confirmar o e-mail antes de liberar a conta e parar de revelar se um e-mail já está em uso";
resíduo do achado B4 da auditoria).
**Depende, para ir a produção:** envio de e-mail funcionando no Replit (Resend com remetente verificado e
`PUBLIC_APP_URL`). Sem isso ninguém consegue terminar o cadastro — é o item l05/l02 da lista de lançamento.

## Decisões (2026-09-29)

1. **A conta só abre depois de confirmar o e-mail.** O cadastro não cria sessão; o link do e-mail cria.
2. **O cadastro responde igual para qualquer e-mail** ("Enviamos um link para …"). Se o e-mail já tem conta
   confirmada, a pessoa recebe um e-mail dizendo que já tem conta, com links para entrar e para redefinir a senha.
3. **Contas que já existem contam como confirmadas.** Ninguém que usa o app hoje precisa confirmar nada.
4. **Quem confirma é dono da senha.** Se o mesmo e-mail for cadastrado de novo antes da confirmação (por engano
   ou por outra pessoa), cada link carrega a senha do seu cadastro; o link usado define a senha da conta.
5. **Link vale 24 horas e uma vez só.** Pode ser reenviado (até 3 por hora por e-mail).
6. **Redefinir a senha pelo e-mail também confirma a conta** — o link chegou no mesmo endereço.
7. Fora de produção o e-mail pode ir para o log ou para uma pasta (`EMAIL_TRANSPORT=log|outbox`); em produção
   só o Resend é aceito.

## Requisitos

| ID | Requisito |
|---|---|
| EV-R1 | QUANDO alguém se cadastra, o sistema NÃO cria sessão e responde 202 com a mesma mensagem e no mesmo tempo mínimo, exista ou não conta com aquele e-mail. |
| EV-R2 | QUANDO o e-mail é novo, o sistema cria a conta sem confirmação e envia um link de confirmação válido por 24 horas. |
| EV-R3 | QUANDO o e-mail já tem conta confirmada, o sistema não altera a conta e envia um e-mail avisando que já existe conta, com links para entrar e redefinir a senha. |
| EV-R4 | QUANDO o e-mail tem conta ainda não confirmada, o sistema envia um novo link que carrega a senha deste cadastro; o link usado define a senha da conta. |
| EV-R5 | QUANDO um link válido é aberto, o sistema confirma a conta, invalida os outros links dela, prepara a lista inicial, cria a sessão e leva a pessoa ao onboarding. Link vencido, usado ou falso mostra "Este link de confirmação é inválido ou expirou." com a opção de pedir outro. |
| EV-R6 | QUANDO a senha está certa mas o e-mail não foi confirmado, o login responde que falta confirmar e oferece reenviar o link; com senha errada, a resposta continua a genérica. |
| EV-R7 | O reenvio responde sempre igual, limita 3 pedidos por hora por e-mail e 10 por origem, e só envia se houver conta não confirmada. |
| EV-R8 | Contas existentes antes desta entrega ficam confirmadas. Redefinir a senha pelo link também confirma a conta. |
| EV-R9 | Excluir a conta apaga os links de confirmação e os contadores do reenvio. |
| EV-R10 | Tokens guardados só como hash; nenhum token, link ou e-mail no log em produção; o token sai da URL ao abrir a página. |
| EV-R11 | Telas "Confira seu e-mail", "Confirmando…" e "Link inválido" no visual do app, acessíveis (AA, foco, `role=status`/`alert`) e sem rolagem lateral em 320–1280px. |

## Fora de escopo

- Trocar o e-mail da conta; limpeza de contas nunca confirmadas (anotar em CONCERNS).
- Configurar o Resend no Replit (item de lançamento separado).

## Critérios de aceite

1. E2E do cadastro completo passando pelo e-mail (pasta de saída), do login antes de confirmar, do reenvio,
   do cadastro repetido (conta confirmada e não confirmada) e do link inválido.
2. Todos os testes que criam conta passam pelo link de confirmação.
3. `lint`, `typecheck`, `test`, build e `test:e2e` verdes.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| EV-R1–R4 | T3 | concluído |
| EV-R5, EV-R10 | T3, T6 | concluído |
| EV-R6, EV-R7 | T3, T5 | concluído |
| EV-R8, EV-R9 | T1, T3, T4 | concluído |
| EV-R11 | T5, T6 | concluído |
