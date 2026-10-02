# Deploy na VPS

**Tamanho:** Large (imagens, compose, e-mail, proxy e roteiro; sem tela nova).
**Origem:** decisão do dono em 2026-09-29 ("vou subir esse projeto em uma VPS") e em 2026-10-02 ("pode usar ninho.whapro.digital").
Itens l04 (backup), l05 (deploy) e l09 (envio de e-mail) do diagnóstico.

## O que já existe na VPS (conferido por SSH em 2026-10-02, só leitura)

Hostinger KVM 4 `srv1819673`, Ubuntu 24.04, x86_64, 4 vCPU, 15 GB de RAM, 181 GB livres. Docker e **Traefik** em `/docker/traefik`
(rede do host, entradas `web`/`websecure`, certificados Let's Encrypt por HTTP-01, só atende containers com `traefik.enable=true`).
Outras aplicações: `talentia` (whapro.digital) e `deskcomm`. O DNS de whapro.digital fica na Cloudflare.

## Decisões

1. **Endereço:** `https://ninho.whapro.digital`.
2. **Docker Compose** em `/docker/ninho`, com Postgres próprio na VPS; nada é compartilhado com as outras aplicações.
3. **Traefik existente** como porta de entrada. Dentro do projeto, um Nginx serve o front e repassa `/api` para a API; assim o
   mesmo conjunto roda igual na VPS e no teste local, com uma regra só no Traefik.
4. **Imagens construídas na própria VPS**, a partir do repositório (chave de deploy só de leitura), como o TalentIA.
5. **E-mail direto pelo Resend** (`RESEND_API_KEY`), sem o conector do Replit.
6. **Backup diário** em volume, com retenção (7 dias, 4 semanas, 6 meses). Cópia para fora da VPS fica como passo seguinte do roteiro.

## Requisitos

| ID | Requisito |
|---|---|
| DV-R1 | Um comando (`docker compose … up -d --build`) sobe banco, atualização do schema, API, front e backup; a API só inicia depois de o schema ser aplicado. |
| DV-R2 | O front é servido com HTTPS pelo Traefik, com volta para `index.html` nas rotas do app, cache longo para arquivos com hash e nenhum cache para o `index.html`. |
| DV-R3 | As páginas saem com cabeçalhos de segurança: `Content-Security-Policy` com `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`. |
| DV-R4 | A API enxerga o IP real de quem acessa (os limites de tentativa são por origem): confia só nos proxies da rede interna (`TRUST_PROXY`). |
| DV-R5 | O e-mail sai pela API do Resend com `RESEND_API_KEY` e `RESEND_FROM_EMAIL`; sem chave, o erro vai para o log e o cadastro continua respondendo igual. `log` e `outbox` seguem proibidos em produção. |
| DV-R6 | Segredos só no `deploy/.env` da VPS (fora do Git); `deploy/.env.example` documenta cada variável. Os containers rodam sem root e sem portas publicadas (só o Traefik chega neles). |
| DV-R7 | Backup diário automático do Postgres com retenção, e o roteiro ensina a restaurar. |
| DV-R8 | Roteiro em português, passo a passo, dizendo onde rodar cada comando: primeiro deploy, atualização, logs, backup/restauração e como desfazer. |

## Critérios de aceite

1. O conjunto de produção sobe no Docker local e responde: saúde da API, página inicial, rota do app (volta para o `index.html`),
   cadastro (`202`) e cabeçalhos de segurança.
2. `lint`, `typecheck`, `test`, build e `test:e2e` verdes.
3. Na VPS: `https://ninho.whapro.digital` com certificado válido, cadastro com e-mail chegando e backup gerado.

## Fora de escopo

- Deploy automático pelo GitHub Actions; cópia do backup para fora da VPS; monitoramento de erros (item l03).

## Rastreio

| Requisito | Status |
|---|---|
| DV-R1 a DV-R8 | código pronto e conjunto testado na VPS em 2026-10-02 (projeto `ninho-test`, porta interna, desmontado depois); falta o deploy real |
