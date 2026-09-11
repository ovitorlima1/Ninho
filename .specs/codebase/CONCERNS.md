# CONCERNS — dívida técnica e áreas frágeis

Base: auditoria "Raio-X do Ninho" (2026-09-11). Cada item foi **reverificado no
código** nesta sessão. Severidade: 🔴 crítica · 🟠 alta · 🟡 média.

⚠️ Snapshot de 2026-09-11 ~19h, durante a Fase 0 de correções: as referências de
linha valem para o commit `e094dec` mais as mudanças ainda não commitadas na
árvore de trabalho. Cada item traz seu **status** — confira no código antes de
planejar em cima dele.

## 🔴 C1 — Tipografia minúscula + zoom bloqueado — **em correção (não commitado)**

`index.html` tinha `maximum-scale=1` (bloqueio de pinch-zoom, WCAG 1.4.4) e
`src/index.css` tinha **90 declarações** com `font-size` de 5px a 9px
(1×5px, 6×6px, 18×7px, 30×8px, 35×9px) — `.week-marker` 5px, `.milestone-text small`
6px, `.card-kicker` 7px. Na árvore atual o viewport virou
`width=device-width, initial-scale=1, viewport-fit=cover` (+ `lang="pt-BR"`) e o
menor `font-size` do CSS é 10px.
Frágil: o bloco "Readable type scale" (`index.css:1004-1200`) sobrescreve **parte**
das regras antigas, então mexer em tamanho de fonte exige checar se aquele seletor
já é sobreposto lá embaixo (e em quais breakpoints). Público-alvo é gestante lendo
no celular — impacto real, não estético.

## 🔴 C2 — Classe `timeline-panel` no painel errado — **corrigido (não commitado)**

Originalmente `OverviewPanel` (`App.tsx:514`) carregava
`phone-content flow timeline-panel` e `TimelinePanel` só `phone-content flow`,
embora todo o bloco `.timeline-panel …` (bloco final de `index.css`, incluindo o
`@media (max-width: 900px)`) tenha sido escrito para a linha do tempo.
Na árvore atual a classe está em `TimelinePanel` (`App.tsx:718`) e saiu do
dashboard.
Frágil: a classe governa **dois** painéis pelo mesmo seletor; qualquer mexida
exige validação visual do dashboard e da linha do tempo em desktop e ≤900px.

## 🔴 C3 — Cálculo de "investido" errado (duas cópias) — **aberto**

`App.tsx:507` (OverviewPanel) e `App.tsx:839` (BudgetPanel), idênticos:
`items.filter(i => i.status !== "A comprar").reduce((s, i) => s + i.price, 0)`.
Dois defeitos: (a) inclui **"Ganhei"** (presente recebido não é gasto);
(b) ignora `qty` — o seed tem "Fralda de pano" 8 un. × R$12 contando como R$12
(`api-server/src/lib/seed.ts:15`).
Frágil: `price` chega do Postgres como string `numeric` e é convertido em
`adaptItem` (`App.tsx:114`) com `parseFloat`; a regra está duplicada em dois
componentes e ainda documentada de forma contrária em `replit.md`
("itens marcados como resolvidos contam como gastos"). Corrigir os três pontos juntos.

## 🔴 C4 — Catálogo com validade única e estouro de `setTimeout` — **corrigido em `e094dec`**

Os 8 itens de `src/lib/recommendations.ts` venciam todos em `2026-09-24` (vitrine
zerada de uma vez, sem alerta) e `getNextRecommendationRefreshDelay()` devolvia
`expiração - agora + 1` sem teto — acima de 2 147 483 647 ms (~24,8 dias) o
`window.setTimeout` de `useRecommendationClock` (`App.tsx:150`) **dispara na hora**,
virando laço de re-render. O commit `fix(C4)` renovou o catálogo até `2026-12-10`
(o que sozinho acionaria o estouro), limitou o atraso a 1 h e somou dois testes.
Resta pendente a origem do problema: catálogo editorial hard-coded no bundle,
que expira em bloco e exige deploy para atualizar.
Frágil: os IDs do catálogo estão duplicados no backend
(`lib/db/src/schema/checklistItems.ts`, `RECOMMENDATION_IDS` e
`RECOMMENDATION_CATEGORY_BY_ID`) — mudar/renomear item exige tocar os dois lados,
senão `POST /api/me/checklist` rejeita o vínculo.

## 🔴 C5 — Botão de remover invisível até o hover — **aberto**

`.delete-item-btn { opacity: 0 }` e `.check-item-row:hover .delete-item-btn { opacity: 1 }`
(`index.css:781-786`). Em touch não há hover: a ação existe (o botão é focável e
tem `aria-label`) mas é invisível para a maioria do público.
Frágil: layout usa `order: 0/1/2` na mesma linha; tornar o botão sempre visível
mexe no espaçamento do `check-item-row`.

## 🟠 A9 — Reset de senha sem limite + limitador em memória — **parcial (não commitado)**

`POST /api/auth/password-reset/request` não chamava limitador nenhum (só `/login`
e `/register` chamavam): cada requisição válida gravava um token e disparava
e-mail via Resend — abuso barato. Na árvore atual a rota já consome
`passwordResetEmailLimiter` (3/h por e-mail) e `passwordResetOriginLimiter`
(10/h por origem) — `routes/auth.ts:226,231`, com testes em `lib/auth.test.ts`.
Continua aberto o fundo do problema: `AuthAttemptLimiter` (`lib/auth.ts:42`)
é um `Map` **por processo**, e o deploy é `autoscale` (`.replit`) — com N
instâncias o limite efetivo é N× o configurado, e reinícios zeram os contadores.
Frágil: o limitador é estado de segurança (`ensureCapacity` recusa em vez de
despejar); qualquer troca por store persistente precisa manter esse comportamento
e as chaves compostas origem+conta.

## 🟠 A10 — Sem design tokens — **aberto**

437 hex literais (298 valores distintos) em `index.css`; os únicos tokens são o
tema shadcn em HSL (`--background`, `--primary`…) — que o CSS do produto quase não
usa — e `--type-*` (linha 1006). Há blocos de cascata duplicados: regras antigas
nas seções temáticas e uma segunda passada corretiva em "Readable type scale".
Frágil: mudar uma cor de marca hoje é find/replace em dezenas de hex parecidos
(`#9f52ce`, `#a05ccc`, `#9854c3`, `#a453d1`…), inclusive dentro do HTML do e-mail
(`api-server/src/lib/email.ts`).

## 🟠 A11 — `App.tsx` monolítico com código morto — **aberto**

2897 linhas, 30+ componentes e 9 mutations em um arquivo; `Workspace` sozinho tem
447 linhas (1638-2084). Entre as linhas **2086 e 2419** há uma cópia antiga inteira
de `Workspace` comentada (334 linhas), que confunde busca e diff.
Frágil: qualquer split precisa preservar o `data-testid` e o CSS global por classe
(não há CSS Modules); comece extraindo os painéis puros (`BudgetPanel`,
`TimelinePanel`) e as funções de cálculo (que também destravam testes — ver TESTING.md).

## 🟠 A12 — Sem CI, sem lint, cobertura mínima — **aberto (cobertura crescendo)**

Não existe `.github/`; `.replit` só faz build/deploy. Não há ESLint nem
configuração de Prettier (o pacote está instalado, sem script). Os testes hoje são
`ninho/src/lib/recommendations.test.ts` (6 casos) e, na árvore de trabalho,
`api-server/src/lib/auth.test.ts` (5 casos) — nada de componente, rota ou E2E.
Os gates são manuais e nenhum roda automaticamente no merge ou no deploy:
`pnpm run typecheck`, `pnpm --filter @workspace/ninho run test:recommendations`,
`pnpm --filter @workspace/api-server run test`,
`PORT=5180 BASE_PATH=/ pnpm --filter @workspace/ninho run build` (todos passando).

## 🟡 Médios

- **Refetch do workspace inteiro a cada mutação** — `onSettled: invalidateQueries(["workspace", uid])`
  em checklist/marcos (`App.tsx:1732, 1750, 1812`) recarrega perfil + itens +
  marcos + orçamento + reservas a cada toque; some com a vantagem do update otimista
  em listas grandes.
- **`GET /api/me/workspace` escreve no banco** — `initializeUser()` (`lib/seed.ts:46`)
  abre transação e faz `INSERT ... ON CONFLICT DO NOTHING` em `profiles` a cada
  leitura; `PUT /api/me/profile` repete via `getOrCreateProfile`. Leitura deveria
  ser leitura; o *seed* pertence ao cadastro.
- **Sem cabeçalhos de segurança** — `app.ts` não usa helmet nem define CSP,
  `X-Frame-Options`, `X-Content-Type-Options`, HSTS; e o estático é servido pelo
  Replit sem headers próprios.
- **Logout não revoga o JWT** — `POST /api/auth/logout` (`routes/auth.ts:303`) só
  expira o cookie; o token continua válido até `exp` (7 dias). A infraestrutura para
  revogar já existe (`sessionVersion`), usada apenas no reset de senha.
- **Sem exclusão de conta (LGPD)** — não há rota de delete de usuário/dados; e como
  nenhuma tabela tem foreign key (`lib/db/drizzle/*.sql`), apagar um usuário exigirá
  varrer 6 tabelas por `user_id` manualmente.
- **Dependências e componentes não usados** — 55 componentes shadcn em
  `src/components/ui/`, apenas 4 importados (`toast`, `toaster`, `tooltip`, `card`);
  arrastam recharts, cmdk, vaul, embla, react-day-picker, input-otp, sonner,
  next-themes, react-hook-form. `framer-motion`, `date-fns`, `react-icons`,
  `@hookform/resolvers` e `zod` não são importados em lugar nenhum do app.
- **Fontes** — `Inter` é baixada no `index.html:19` e nunca usada; Montserrat/Space
  Mono entram por `@import` no topo do CSS (cadeia bloqueante). Ver INTEGRATIONS.md.
- **Contrato de API só no papel** — `lib/api-spec/openapi.yaml` descreve apenas
  `/healthz`; todo o resto é tipado à mão em `src/lib/api.ts`, em paralelo aos
  tipos Drizzle. Divergência silenciosa entre servidor e cliente é questão de tempo.
- **Log e idioma inconsistentes na API** — 5 `console.error` legados em
  `routes/me.ts` (53, 187, 320, 350, 383) fora do `req.log`, e mensagens de erro
  em inglês (`"Internal server error"`, `"Item not found"`) numa API cujo restante
  responde em pt-BR.
- **Documentação desatualizada** — `replit.md` descreve a regra antiga de orçamento
  (conflita com C3) e a porta 8080 (local hoje é 8787); `.agents/memory/database-startup-migrations.md`
  ainda fala de "proxy Clerk", que não existe mais no código.
