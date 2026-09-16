# CI da Fase 3 (T6)

Arquivo: `.github/workflows/ci.yml`. Roda em todo `push` (qualquer branch) e em todo
`pull_request`. Execuções antigas da mesma ref são canceladas quando chega um push novo.
O token do workflow só tem permissão de leitura (`contents: read`).

## O que o workflow faz

**Job `checks`** (ubuntu-latest, Node 24, pnpm 11.17.0 com cache):

1. `pnpm install --frozen-lockfile` — falha se o `pnpm-lock.yaml` estiver desatualizado.
2. `pnpm run typecheck`
3. `pnpm run lint`
4. `pnpm run test` — testes unitários (Vitest), sem banco.
5. `pnpm run build` — com `PORT=5180` e `BASE_PATH=/`, que o build do front exige.

**Job `e2e`** (só roda se `checks` passar):

- Sobe um Postgres 16 como serviço (`ninho`/`ninho`/`ninho`, porta 5432), com health-check.
- `E2E_DATABASE_URL` aponta para `ninho_test` no mesmo servidor; o `globalSetup` do Playwright
  cria esse banco se não existir.
- Gera um `E2E_SESSION_SECRET` descartável (`openssl rand -hex 32`) a cada execução.
- Instala o Chromium do Playwright (`--with-deps`) e roda `pnpm run test:e2e`.
- Se falhar, publica `artifacts/ninho/playwright-report` e `artifacts/ninho/test-results`
  como artefato `playwright-report`, guardado por 7 dias (aba **Actions** → execução →
  **Artifacts**).

Versão do pnpm: o `package.json` não tem `packageManager`, então o workflow fixa a mesma
versão usada localmente (11.17.0; lockfile v9). Se mudar a versão local, mude `PNPM_VERSION`
no topo do workflow.

Os `overrides` do `pnpm-workspace.yaml` removem binários de plataforma que não são
linux-x64/macOS; como o runner é linux-x64, isso não atrapalha.

## Como tornar o CI obrigatório na `main`

Só o dono do repositório consegue fazer isso, pela interface do GitHub. Os checks só aparecem
na lista depois que o workflow rodar pelo menos uma vez (basta um push).

**Opção A — Rulesets (recomendada):**

1. No repositório, abra **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nome: `main protegida`; **Enforcement status**: `Active`.
3. **Target branches → Add target → Include default branch** (ou o padrão `main`).
4. Marque **Require a pull request before merging** (opcional, mas recomendado).
5. Marque **Require status checks to pass**, clique em **Add checks** e adicione `checks` e
   `e2e`. Marque também **Require branches to be up to date before merging**.
6. Marque **Block force pushes** e salve com **Create**.

**Opção B — Branch protection clássica:**

1. **Settings → Branches → Add branch protection rule** (ou **Add classic branch protection
   rule**).
2. **Branch name pattern**: `main`.
3. Marque **Require status checks to pass before merging** e
   **Require branches to be up to date before merging**.
4. Na busca de checks, adicione `checks` e `e2e`.
5. Salve com **Create**.

Depois disso, um PR para `main` só pode ser mesclado com os dois jobs verdes.
