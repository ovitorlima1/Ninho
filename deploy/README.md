# Ninho na VPS — roteiro de deploy

O Ninho roda em `https://ninho.whapro.digital`, na VPS da Hostinger (`srv1819673`, alias SSH `whapro-vps`), ao lado do
TalentIA e do Deskcomm. Quem recebe a internet é o **Traefik que já existe lá**; o Ninho só se registra nele.

Cada comando abaixo diz **onde** rodar:

- **No Mac**: no Terminal do seu computador.
- **Na VPS**: depois de entrar com `ssh whapro-vps` (ou pelo Termius).
- **No painel**: no site da Cloudflare ou do Resend.

## O que sobe

| Serviço | O que faz |
|---|---|
| `postgres` | Banco do Ninho (só dele), com os dados no volume `ninho_pgdata`. |
| `migrate` | Aplica o schema no banco e termina. A API só sobe se isto der certo. |
| `api` | A API (Node). Não publica porta; só o `web` fala com ela. |
| `web` | Nginx com o front e o repasse de `/api`. É o único que o Traefik enxerga. |
| `pgbackups` | Cópia diária do banco no volume `ninho_pgbackups` (7 dias, 4 semanas, 6 meses). |

## Antes do primeiro deploy

### 1. DNS — no painel da Cloudflare

Em **whapro.digital → DNS → Registros**, adicione:

| Tipo | Nome | Conteúdo | Proxy |
|---|---|---|---|
| A | `ninho` | `179.197.68.119` | **Somente DNS** (nuvem cinza) |

A nuvem precisa ficar cinza: o Traefik emite o certificado por HTTP e a nuvem laranja atrapalha.
Para conferir, **no Mac**:

```bash
dig +short ninho.whapro.digital
```

Deve responder `179.197.68.119`.

### 2. E-mail — no painel do Resend

Sem e-mail ninguém termina o cadastro (a conta só abre pelo link de confirmação).

1. Crie a conta em resend.com e vá em **Domains → Add Domain**. Use `ninho.whapro.digital`.
2. O Resend mostra alguns registros DNS (MX, TXT de SPF e DKIM). Crie cada um **no painel da Cloudflare**, em "Somente DNS".
3. Volte ao Resend e clique em **Verify**. Espere ficar "Verified".
4. Em **API Keys → Create API Key**, crie uma chave com permissão **Sending access** só para esse domínio. Copie: ela aparece uma vez.

O remetente fica, por exemplo, `Ninho <ola@ninho.whapro.digital>`.

### 3. Chave de deploy — na VPS e no GitHub

A VPS baixa o código com uma chave que só lê este repositório.

**Na VPS:**

```bash
ssh-keygen -t ed25519 -f /root/.ssh/ninho_deploy_ed25519 -N "" -C "ninho-deploy@whapro-vps"
```

```bash
cat /root/.ssh/ninho_deploy_ed25519.pub
```

Copie a linha que aparece e, **no GitHub**, em `ovitorlima1/Ninho → Settings → Deploy keys → Add deploy key`, cole-a
(título "VPS Hostinger", **sem** marcar "Allow write access").

**Na VPS**, ensine o SSH a usar essa chave para o repositório do Ninho:

```bash
cat >> /root/.ssh/config <<'EOF'

Host github-ninho
  HostName github.com
  User git
  IdentityFile /root/.ssh/ninho_deploy_ed25519
  IdentitiesOnly yes
EOF
```

## Primeiro deploy — na VPS

```bash
git clone git@github-ninho:ovitorlima1/Ninho.git /docker/ninho
```

```bash
cd /docker/ninho && cp deploy/.env.example deploy/.env && chmod 600 deploy/.env
```

Gere os dois segredos direto no arquivo (eles não aparecem na tela):

```bash
cd /docker/ninho && sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|; s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" deploy/.env
```

Abra o arquivo e preencha `RESEND_API_KEY` e `RESEND_FROM_EMAIL` (Ctrl+O salva, Ctrl+X sai):

```bash
nano /docker/ninho/deploy/.env
```

Suba tudo (a primeira vez leva alguns minutos, porque constrói as imagens):

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env up -d --build
```

Confira:

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env ps
```

`postgres`, `api`, `web` e `pgbackups` devem estar "Up" (os três primeiros com "healthy"); o `migrate` aparece como
"Exited (0)", que é o certo: ele roda e termina.

**No Mac**, confira de fora:

```bash
curl -s https://ninho.whapro.digital/api/healthz
```

Deve responder `{"status":"ok"}`. O certificado pode levar um minuto para sair na primeira vez.

Depois, abra `https://ninho.whapro.digital` no navegador, crie uma conta e confirme que o e-mail chega.

## Atualizar para uma versão nova — na VPS

```bash
cd /docker/ninho && git pull && docker compose -f deploy/compose.prod.yml --env-file deploy/.env up -d --build
```

O `migrate` roda de novo antes da API. Se a versão nova precisar **apagar** uma coluna ou tabela, ele para e a API antiga
continua no ar; nesse caso, me chame antes de forçar.

## Ver o que está acontecendo — na VPS

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env logs --tail 100 api
```

Troque `api` por `web`, `migrate`, `postgres` ou `pgbackups`. E-mail que não saiu aparece no log da `api` como
"email delivery error".

## Backup e restauração — na VPS

O `pgbackups` grava uma cópia por dia. Para fazer uma agora:

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env exec pgbackups /backup.sh
```

Para listar as cópias:

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env exec pgbackups ls -lh /backups/last /backups/daily
```

Para **restaurar** a cópia mais recente (isto substitui os dados atuais; a API fica parada durante a restauração):

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env stop api web
```

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env exec pgbackups sh -c 'zcat /backups/last/ninho-latest.sql.gz | psql -h postgres -U ninho -d ninho'
```

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env start api web
```

A cópia fica na própria VPS. A Hostinger também faz backup semanal da máquina inteira. **Falta** mandar a cópia diária para
fora da VPS (rclone para um armazenamento externo): é o próximo passo depois do lançamento.

## Voltar para a versão anterior — na VPS

```bash
cd /docker/ninho && git log --oneline -5
```

Escolha o commit anterior (o código da primeira coluna) e troque `COMMIT` por ele:

```bash
cd /docker/ninho && git checkout COMMIT && docker compose -f deploy/compose.prod.yml --env-file deploy/.env up -d --build
```

Isso volta o código, não o banco. Se a versão nova mudou o schema, restaure também o backup de antes da atualização.

## Parar ou remover — na VPS

Parar sem apagar nada:

```bash
cd /docker/ninho && docker compose -f deploy/compose.prod.yml --env-file deploy/.env down
```

Os dados ficam nos volumes `ninho_pgdata` e `ninho_pgbackups`. **Nunca** use `down -v`: ele apaga o banco e os backups.

## Testar o conjunto no computador — no Mac

```bash
docker compose -p ninho-local -f deploy/compose.prod.yml -f deploy/compose.local.yml --env-file deploy/.env.local up -d --build
```

Abre em `http://localhost:8088`. O `deploy/.env.local` é seu (fica fora do Git); sem `RESEND_API_KEY`, o cadastro responde
normalmente e o erro de envio aparece no log da API.

## Se algo der errado

| Sintoma | O que olhar |
|---|---|
| Navegador avisa de certificado inválido | O DNS aponta para a VPS e a nuvem da Cloudflare está cinza? `docker logs traefik-traefik-1 --tail 50` na VPS. |
| `404 page not found` do Traefik | O `web` está "healthy"? O `APP_DOMAIN` do `deploy/.env` é `ninho.whapro.digital`? |
| `502` no `/api` | A `api` caiu: veja os logs dela. |
| `migrate` com "Exited (1)" | Veja `logs migrate`. Em geral é senha do banco diferente da que criou o volume. |
| Cadastro não manda e-mail | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e o domínio verificado no Resend. |
