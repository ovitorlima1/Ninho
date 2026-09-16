# CONCERNS — dívida técnica e áreas frágeis

Base: auditoria "Raio-X do Ninho" (2026-09-11, 35 achados: C1–C5, A1–A12, M1–M14, B1–B4).
Estado depois das Fases 0–3 (branch `fase-0-correcoes-urgentes`, até `0c7ca8d`, sem merge nem push).
Severidade: 🔴 crítica · 🟠 alta · 🟡 média · ⚪ baixa. Status: ✅ resolvido · 🔶 parcial · ⛔ aberto.
Referências `arquivo:linha` conferidas no código em 2026-09-16.

## Resumo

| Situação | Itens |
|---|---|
| ✅ Resolvidos (Fases 0–3) | C1–C5, A1–A8, A10–A12, M1–M9, M11–M14, B1, B2 |
| 🔶 Parciais | A9 (limite existe, mas em memória → Fase 4), B3 (botão morto saiu; "Voltar" do onboarding continua à direita) |
| ⛔ Abertos → Fase 4 (Segurança e privacidade) | M10 (cabeçalhos, logout, LGPD), B4, A9 persistente, validação e limites de entrada, logs |
| ⛔ Abertos sem fase | foto do login, ajustes de texto/UI, modo escuro, OpenAPI, mensagens em inglês, docs antigas |

## Resolvidos

| Código | Achado | Fase | Commit(s) |
|---|---|---|---|
| 🔴 C1 | Fontes de 5–9px e zoom bloqueado | 0 | `1d38d67` fix(C1,A2): libera zoom, declara pt-BR e usa 16px nos campos · `3b6e594` fix(C1): piso de 12px para todo texto visível |
| 🔴 C2 | `timeline-panel` no painel errado | 0 | `bb5209a` fix(C2): aplica estilos de legibilidade ao painel da linha do tempo |
| 🔴 C3 | "Investido" somava presentes e ignorava quantidade | 0 | `0b83a1f` fix(C3): investido soma preço × quantidade só de itens comprados (regra única em `src/lib/budget.ts`) |
| 🔴 C4 | Catálogo vencia em bloco + estouro do `setTimeout` | 0 | `e094dec` fix(C4): renova catálogo de inspirações até 2026-12-10 e limita o timer |
| 🔴 C5 | Lixeira invisível no toque | 0 | `d851b70` fix(C5): botão de remover visível no toque e no foco |
| 🟠 A1 | Contraste abaixo de AA | 2 | `567c9d4` refactor(A10,A1,A5,M3,M6,M12): CSS reescrito sobre tokens |
| 🟠 A2 | `lang="en"` | 0 | `1d38d67` |
| 🟠 A3 | Status em ciclo escondido | 1 | `44e120c` feat(A3,A4,A6,A7,M13): lista com status visível, edição de item e desfazer |
| 🟠 A4 | Sem preço/quantidade editáveis | 1 | `44e120c` |
| 🟠 A5 | Visão geral repetitiva, sem semana | 2 | `567c9d4` |
| 🟠 A6 | Modais sem Esc/foco/Enter | 1 | `44e120c` · `7af5048` fix(A6): devolve o foco ao botão de origem |
| 🟠 A7 | Onboarding falhava calado | 1 | `44e120c` |
| 🟠 A8 | Sessão expirada virava "verifique a conexão" | 1 | `85406e8` fix(A8,M1): sessão expirada leva ao login e erros aparecem por campo |
| 🟠 A10 | Sem design tokens | 2 | `50b6169` feat(M8,M11): … tokens da nova identidade · `567c9d4` |
| 🟠 A11 | `App.tsx` de 2.897 linhas + código morto | 1, 3 | `6935710` chore(A11): remove cópia comentada do Workspace · `be5699d` refactor(A11): App.tsx dividido em telas, componentes e utilitários |
| 🟠 A12 | Sem CI, lint e testes | 3 | `9f75ec9` chore(A12): Vitest, ESLint e TypeScript strict · `c21866c` test(A12): E2E dos fluxos principais com axe, e workflow de CI |
| 🟡 M1 | Erros de formulário longe do campo | 1 | `85406e8` |
| 🟡 M2 | Orçamento aceitava negativo, erro genérico | 1 | `3f225e3` feat(M2,M5,M14,M13,B1) |
| 🟡 M3 | Tablet com layout de celular esticado | 2 | `567c9d4` |
| 🟡 M4 | Navegação dividida, telas com 3 nomes | 2 | `109de56` feat(M4): casca única com cinco destinos |
| 🟡 M5 | Marcos atrasados e semana arredondada | 1 | `133721a` feat(M5): semana gestacional em semanas completas · `3f225e3` |
| 🟡 M6 | Alvos de toque pequenos | 2 | `567c9d4` |
| 🟡 M7 | Inspirações com 2 fotos genéricas | 3 | `85e1a8e` perf(M8,M7): code-splitting por rota, dependências sem uso fora e inspirações sem foto |
| 🟡 M8 | Bundle único com peso morto, fontes | 2, 3 | `50b6169` (fontes) · `85e1a8e` (deps, `components/ui`, lazy por rota) |
| 🟡 M9 | Refetch a cada toque; GET gravava no banco | 3 | `dc934a4` perf(M9): seed no cadastro e leitura do workspace sem escrita · `6efef6c` perf(M9): cache do workspace atualizado pela resposta da API · `0c7ca8d` test(M9) |
| 🟡 M11 | Movimento sem `prefers-reduced-motion` | 2 | `50b6169` |
| 🟡 M12 | Fonte mono em rótulos e campos | 2 | `567c9d4` |
| 🟡 M13 | Ações destrutivas sem desfazer/confirmação | 1 | `44e120c` · `3f225e3` |
| 🟡 M14 | Perfil trancado atrás do lápis | 1 | `3f225e3` |
| ⚪ B1 | Telas de sistema em inglês | 1 | `3f225e3` |
| ⚪ B2 | Confirmação duplicada no perfil | 1 | `3f225e3` (F1-R23) |

Resíduos frágeis dos resolvidos:
- **C4:** o catálogo continua hard-coded no bundle (`artifacts/ninho/src/lib/recommendations.ts`,
  vence 2026-12-10) e os IDs estão duplicados no backend (`lib/db/src/schema/checklistItems.ts:7`,
  `RECOMMENDATION_IDS` + mapa de categorias). O teste-alarme (`recommendations.test.ts:77`) falha
  a partir de **2026-11-26** e derruba `pnpm test` e o CI até a curadoria ser renovada.
- **A11:** `features/workspace/use-workspace.ts` tem 446 linhas (hook com todas as mutations) —
  candidato a dividir se crescer. CSS continua global por classe (`styles/components.css`, 1.387 linhas).
- **A12:** o CI (`.github/workflows/ci.yml`) **nunca rodou** — nada foi enviado ao GitHub — e ainda
  não é obrigatório na `main` (passo a passo em `.specs/features/fase-3-base-tecnica/ci.md`).

## Parciais

### 🟠 A9 — Limitadores em memória — 🔶 parcial (Fase 0 → Fase 4)

`951d38d` fix(A9): limita pedidos de recuperação de senha por e-mail e IP (3/h e 10/h,
`artifacts/api-server/src/routes/auth.ts:241-249`). Continua aberto: `AuthAttemptLimiter` é um
`Map` por processo (`artifacts/api-server/src/lib/auth.ts:46`, instâncias em `:155`, `:163`, `:173`)
e o deploy é autoscale (`.replit`) — N instâncias = N× o limite, e reinício zera os contadores.
Frágil: o limitador recusa em vez de despejar quando cheio, e as chaves são compostas
origem+conta; um store persistente precisa manter os dois comportamentos. O E2E depende de a
API subir limpa a cada execução.

### ⚪ B3 — Botão sem ação e "Voltar" à direita — 🔶 parcial

O `.desktop-help-button` sem `onClick` saiu com a casca nova (`109de56`). O "Voltar" do passo 2
do onboarding continua no canto superior direito: é o último filho de `.modal-top`
(`artifacts/ninho/src/features/onboarding/onboarding-modal.tsx:95-98`), que usa
`justify-content: space-between` (`artifacts/ninho/src/styles/components.css:1012`).

## Abertos → Fase 4 (Segurança e privacidade)

- **M10a — Cabeçalhos e superfície HTTP.** `artifacts/api-server/src/app.ts` não usa helmet
  (sem CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`), não chama
  `app.disable("x-powered-by")`, mantém `express.urlencoded` sem necessidade (`app.ts:32`) e não
  confere `Origin` nas rotas que mudam estado (a defesa hoje é só `SameSite=Lax` no cookie,
  `lib/auth.ts:306`).
- **M10b — Logout não revoga o JWT.** `POST /api/auth/logout` só expira o cookie
  (`routes/auth.ts:348-351`); o token vale até `exp` (7 dias, `lib/auth.ts:10`). `sessionVersion`
  já existe e só é incrementado no reset de senha (`routes/auth.ts:324`).
- **M10c — LGPD: sem exclusão de conta nem exportação de dados.** Não há rota para isso em
  `routes/me.ts` nem em `routes/auth.ts`. A data prevista do parto é dado de saúde (sensível).
  Nenhuma migração em `lib/db/drizzle/*.sql` declara foreign key, então apagar um usuário exige
  varrer as tabelas por `user_id` manualmente.
- **Validação com Zod nas rotas de acesso.** `register`/`login` usam `validateCredentials` escrito
  à mão (`routes/auth.ts:38`), e `password-reset/request|complete` fazem parse manual do corpo
  (`routes/auth.ts:227-231`, `:283-286`), enquanto as rotas de `me.ts` usam schemas Zod.
- **Limites do schema de orçamento.** `upsertBudgetSchema` (`lib/db/src/schema/budgetCategories.ts:20-27`)
  aceita um array sem tamanho máximo e `category` como texto livre (1–100 caracteres), e o
  `PUT /api/me/budget` apaga e reinsere tudo (`routes/me.ts:358-385`).
- **Logs com dados pessoais.** Cinco `console.error(..., err)` em `routes/me.ts` (`:52`, `:187`,
  `:320`, `:350`, `:383`) imprimem o erro inteiro fora do pino — sem o `redact` de
  `lib/logger.ts` — e erros do Postgres podem carregar valores da consulta (nome, data prevista).
- **B4a — Enumeração de contas.** O login só roda o scrypt quando o usuário existe
  (`routes/auth.ts:185`), então o tempo de resposta revela o e-mail; o cadastro responde 400
  para e-mail já existente e 201 para novo (`routes/auth.ts:135-138`).
- **B4b — Token de redefinição no histórico.** `PasswordResetPage` lê `?token=` da URL
  (`artifacts/ninho/src/features/auth/password-reset-pages.tsx:82`) e não chama
  `history.replaceState` em nenhum ponto do arquivo.
- **A9 persistente** (ver Parciais).

## Abertos sem fase

- **Foto do login (decisão do dono).** `artifacts/ninho/public/login-pregnancy.png` (343 kB) não
  é referenciada por nenhum arquivo de `src/` nem pelo `index.html`; é provavelmente material de
  terceiros (captura com a marca de outro produto, ver `.specs/project/STATE.md`). Apagar ou
  substituir por imagem licenciada.
- **Ajustes de texto/UI vistos na divisão do `App.tsx`:**
  - `RecommendationLinkModal`: "combina com itens de … **que já está**" — falta o plural
    ("estão"), e o ternário seguinte devolve "na sua lista" nos dois ramos
    (`features/recommendations/recommendation-link-modal.tsx:39`).
  - Iniciais do avatar: o Perfil usa as 2 primeiras letras do nome
    (`features/profile/profile-panel.tsx:58`, "Ana Paula" → "AN"), o topo usa `initialsFor`
    (primeira + última palavra, `lib/format.ts:14-18`, usado em `layout/app-shell.tsx:105` → "AP").
  - `GiftShareCard`: "gerar novo" confirma e chama o mesmo `onCreate` do "criar"
    (`features/profile/gift-share-card.tsx:63`, `:72`, `:83`). **Conferido na API:** não é bug —
    `POST /api/me/share` revoga o link ativo e cria outro token na mesma transação
    (`artifacts/api-server/src/routes/me.ts:74-103`), então o link antigo para de funcionar.
    Só o nome do handler engana.
- **Modo escuro não implementado.** `index.html:19` declara `color-scheme: light` e nenhum arquivo
  de `src/styles/` tem `prefers-color-scheme`; os tokens (`styles/tokens.css`) estão prontos para
  receber uma paleta escura.
- **Contrato de API só no papel.** `lib/api-spec/openapi.yaml` descreve só `/healthz` (linha 14);
  o front usa apenas `customFetch` do `@workspace/api-client-react` (`src/lib/api.ts:5`) e tipa o
  resto à mão, em paralelo aos tipos Drizzle. Os hooks gerados não são usados.
- **Mensagens de erro em inglês na API.** 15 respostas com `"Internal server error"`,
  `"Item not found"` ou `"Invalid input"` em `artifacts/api-server/src/routes/`, numa API que
  responde o resto em pt-BR (o front traduz via `lib/errors.ts`, mas o contrato fica misto).
- **Docs antigas.** `replit.md:8` ainda cita a porta 8080 para a API (local é 8787);
  `.agents/memory/database-startup-migrations.md:8` fala de "Clerk proxy", que não existe mais.
