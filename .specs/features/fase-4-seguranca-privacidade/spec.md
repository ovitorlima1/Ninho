# Fase 4 — Segurança e privacidade

**Tamanho:** Large (sessões, limitador persistente, endurecimento HTTP, LGPD).
**Design:** `design.md`.
**Origem:** auditoria "Raio-X do Ninho" — A9 (persistência), M10, B4 e itens abertos em `.specs/codebase/CONCERNS.md`.
**Depende de:** Fases 0–3 (branch `fase-0-correcoes-urgentes`).

## Problema

O Ninho guarda dados de gestação — dado de saúde, sensível pela LGPD — e hoje:
sair só apaga o cookie (um token copiado vale por 7 dias); os limites de tentativa vivem na
memória de cada processo e zeram no autoscale; a API não manda cabeçalhos de segurança e
aceita formulários de outros sites; não há como exportar os dados nem excluir a conta; parte
dos erros vai para o log com os parâmetros da consulta (que podem conter anotações pessoais);
e o login responde mais rápido quando o e-mail não existe.

## Decisões (2026-09-16)

1. **Sessões registradas:** cada login cria uma sessão no banco. "Sair" encerra só aquele
   aparelho; o Perfil tem "sair de todos os aparelhos".
2. **Exclusão imediata:** o Perfil tem "exportar meus dados" (JSON) e "excluir minha conta",
   que pede a senha e a palavra EXCLUIR e apaga tudo na hora, numa transação.
3. **Cabeçalhos sem dependência nova:** um middleware próprio no lugar do `helmet` (poucas
   linhas, sem pacote novo em produção). O front é servido como estático pelo Replit, então a
   política de conteúdo da página vai por `<meta http-equiv>`.

## Requisitos

### Sessões (M10)

| ID | Requisito |
|---|---|
| F4-R1 | Todo login e cadastro cria uma sessão (`auth_sessions`) e o token carrega o id dela. Uma requisição só é aceita se a sessão existir, não estiver revogada nem expirada, e a versão de sessão da conta bater. |
| F4-R2 | `POST /api/auth/logout` revoga a sessão atual: o mesmo token deixa de funcionar na hora. |
| F4-R3 | `POST /api/me/sessions/revoke-all` revoga todas as sessões da conta (inclusive a atual). A redefinição de senha faz o mesmo. |
| F4-R4 | Tokens emitidos antes da mudança (sem id de sessão) são recusados com 401, levando ao login com o aviso de sessão expirada. |

### Limites de tentativa (A9)

| ID | Requisito |
|---|---|
| F4-R5 | Os limites de login, cadastro, recuperação de senha, exclusão de conta e reserva anônima de presente ficam no Postgres (`auth_attempts`) e valem entre processos e reinícios. |
| F4-R6 | As chaves não guardam e-mail nem IP em claro (hash SHA-256 com o segredo da sessão). Registros vencidos são apagados periodicamente. |
| F4-R7 | Os valores atuais continuam: login e cadastro 5 por 15 min (por conta e por origem), recuperação 3/h por e-mail e 10/h por origem; novos: exclusão de conta 5 por 15 min por conta, reserva de presente 20/h por origem. |

### Endurecimento HTTP (M10)

| ID | Requisito |
|---|---|
| F4-R8 | Respostas da API trazem `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` restritiva e, em produção, `Strict-Transport-Security`. Rotas autenticadas e de acesso respondem `Cache-Control: no-store`. Sem `X-Powered-By`. |
| F4-R9 | Só JSON é aceito (sem `urlencoded`), com limite de 64 kB; corpo malformado recebe 400 em JSON; erros inesperados recebem 500 genérico em JSON. |
| F4-R10 | Requisições que alteram dados (POST/PUT/PATCH/DELETE) vindas de outra origem recebem 403 (checagem de `Origin`, com `Sec-Fetch-Site` como apoio). |
| F4-R11 | `index.html` declara uma política de conteúdo (`Content-Security-Policy` via meta) que permite só o próprio site, as fontes do Google e a API. |

### Validação e privacidade de logs (M10, B4)

| ID | Requisito |
|---|---|
| F4-R12 | Rotas de acesso validam o corpo com Zod; o orçamento aceita no máximo 4 categorias e só as categorias conhecidas. |
| F4-R13 | Nenhum erro vai para o log com parâmetros de consulta; todo log passa pelo logger com redação (`req.log`). Mensagens de erro da API em pt-BR. |
| F4-R14 | Login com e-mail inexistente leva o mesmo tempo que com e-mail existente (compara com um hash fictício); o cadastro com e-mail já usado também faz o trabalho de hash. |
| F4-R15 | Na página de redefinição de senha, o token sai da barra de endereço (e do histórico) assim que é lido. |

### LGPD

| ID | Requisito |
|---|---|
| F4-R16 | `GET /api/me/export` devolve um arquivo JSON com todos os dados da conta (e-mail, datas, perfil, itens, marcos, orçamento, link de presentes sem o token e reservas). O Perfil tem "exportar meus dados". |
| F4-R17 | `DELETE /api/me/account` com a senha e a palavra EXCLUIR apaga numa transação todas as linhas da conta em todas as tabelas, revoga as sessões e limpa o cookie. Senha errada: erro por campo, nada é apagado. |
| F4-R18 | O Perfil tem "sair deste aparelho", "sair de todos os aparelhos" (com confirmação) e "excluir minha conta" (diálogo com senha e confirmação), acessíveis por teclado. |

## Fora de escopo

- Política de privacidade e termos (texto jurídico — decisão do dono; apontado no fim da fase).
- Monitoramento de erros (Sentry) — exige conta externa.
- Chaves estrangeiras com `ON DELETE CASCADE`: exigem migração com dados de produção; a
  exclusão é feita explicitamente em transação e coberta por teste.
- Verificação de e-mail no cadastro (resolveria a enumeração no cadastro; exige fluxo de e-mail).

## Critérios de aceite

1. Token reutilizado depois de sair → 401. "Sair de todos" derruba outra sessão aberta.
2. Linhas em `auth_attempts` com chaves em hash; limite de recuperação continua em 3/h por e-mail.
3. Cabeçalhos de F4-R8 presentes; `X-Powered-By` ausente; POST com `Origin` de outro site → 403.
4. Exportação traz os itens da conta; exclusão com senha errada não apaga; com senha certa não
   deixa nenhuma linha da conta em nenhuma tabela e o login seguinte falha.
5. Nenhum `console.*` na API; nenhum texto de erro em inglês nas respostas.
6. Gates: typecheck, lint, testes unitários, build e E2E (com os cenários novos) verdes.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| — | T1 (tabelas) | pendente |
| F4-R1–R4, R18 (sair) | T2 | pendente |
| F4-R5–R7 | T3 | pendente |
| F4-R8–R11 | T4 | pendente |
| F4-R12–R15 | T5 | pendente |
| F4-R16, R17, R18 (dados e exclusão) | T6 | pendente |
| — | T7 (validação) | pendente |
