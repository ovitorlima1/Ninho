# Deploy na VPS — resumo

**Código**
- `deploy/Dockerfile` (alvos `api`, `web`, `migrate`; Debian, linux/amd64), `deploy/nginx.conf` (front, repasse de `/api`,
  cabeçalhos de segurança, cache), `deploy/compose.prod.yml` (postgres, migrate, api, web, pgbackups; labels do Traefik),
  `deploy/compose.local.yml`, `deploy/.env.example` e o roteiro `deploy/README.md`.
- API: e-mail direto pela API do Resend (`RESEND_API_KEY`, limite de 10 s), sem `@replit/connectors-sdk`; `TRUST_PROXY`
  configurável (produção: `loopback, uniquelocal`).

**Teste na VPS (2026-10-02)** — o Docker do Mac não alcançava o Docker Hub, então o conjunto foi construído e testado na própria
VPS, num projeto separado (`ninho-test`, porta 127.0.0.1:18088, sem Traefik), e desmontado depois (`down -v` só do projeto de teste;
os outros projetos ficaram como estavam).
- Build das três imagens em 1m53s; `migrate` aplicou o schema e saiu com 0; `api`, `web` e `postgres` saudáveis.
- `/api/healthz` ok; `/` e `/gifts/12` devolvem o `index.html` com CSP (`frame-ancestors 'none'`), `X-Frame-Options`, HSTS,
  `nosniff`, `Referrer-Policy` e `Permissions-Policy`; `/assets/*` com cache de um ano.
- Limite por origem enxerga o IP de quem acessa: 6 logins de IPs diferentes passam; do mesmo IP, o 6º recebe 429.
- Cadastro responde 202; sem chave do Resend o erro vai só para o log. Com `PUBLIC_APP_URL` em http a API recusa (exigência de produção).
- Origem de outro site → 403. Backup manual gerou `ninho-latest.sql.gz`.

**Falta:** Resend (conta, domínio, chave), chave de deploy no GitHub, primeiro `up` em `/docker/ninho` e cópia do backup para fora da VPS.
