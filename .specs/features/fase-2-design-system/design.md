# Fase 2 — Design

## 1. Tokens

Definidos uma vez em `:root` (`index.css`, camada `base`) e expostos ao Tailwind com
`@theme inline`, para que os componentes shadcn que ainda existem (toaster) usem a mesma paleta.

### Cor

| Token | Valor | Uso | Contraste medido |
|---|---|---|---|
| `--color-bg` | `#F7F2EA` | fundo da página (ivory) | — |
| `--color-surface` | `#FFFDF9` | cards, diálogos | — |
| `--color-surface-sunk` | `#F0E9DF` | campos, trilhos, áreas recuadas | — |
| `--color-line` | `#E4DBCF` | divisórias (decorativas) | 1,2:1 (não é controle) |
| `--color-line-strong` | `#9A8B7C` | borda de campo e de controle | 3,25:1 sobre surface |
| `--color-ink` | `#2B2521` | texto principal | 14,9:1 surface · 13,6:1 bg |
| `--color-ink-muted` | `#6B5F57` | texto de apoio, rótulos | 6,1:1 surface · 5,5:1 bg |
| `--color-brand` | `#7A2E3B` | vinho: botão principal, seleção, links | 9,1:1 surface; branco sobre ele 9,2:1 |
| `--color-brand-strong` | `#5E2230` | hover/pressionado | — |
| `--color-brand-soft` | `#F3E4E4` | fundo de seleção suave | vinho sobre ele 7,5:1 |
| `--color-on-brand` | `#FFFFFF` | texto sobre vinho | — |
| `--color-accent` | `#6F8A72` | sage: preenchimento da fita, ícones grandes | 3,7:1 (só não-texto) |
| `--color-accent-strong` | `#4F6B53` | texto e ícone sage, sucesso | 5,8:1 surface |
| `--color-accent-soft` | `#E6EEE4` | fundo de sucesso | accent-strong sobre ele 5,0:1 |
| `--color-warning` | `#8A5A1F` | atrasado | 5,8:1 surface |
| `--color-warning-soft` | `#F6EBDD` | fundo de atrasado | — |
| `--color-danger` | `#9B3434` | erro, remover | ver T5 |
| `--color-danger-soft` | `#F7E6E3` | fundo de erro | — |
| `--color-overlay` | `rgb(43 37 33 / .45)` | fundo de diálogo | — |
| `--tape-track` | `#EFE3CF` | fita métrica: trilho | — |
| `--tape-tick` | `rgb(43 37 33 / .28)` | fita métrica: marcações | — |

Regra: **sage nunca é cor de texto pequeno** (use `accent-strong`). Vinho é a única cor de ação.

### Tipografia

| Token | Valor |
|---|---|
| `--font-display` | `"Fraunces", "Iowan Old Style", Georgia, serif` (500, 600; eixo opsz) |
| `--font-body` | `"Karla", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (400, 500, 600, 700) |
| `--text-xs` | `.75rem` (12) — rótulos, metadados |
| `--text-sm` | `.875rem` (14) — texto de apoio, botões |
| `--text-base` | `1rem` (16) — corpo, campos |
| `--text-lg` | `1.125rem` (18) — títulos de card |
| `--text-xl` | `1.375rem` (22) — títulos de seção, diálogos |
| `--text-2xl` | `1.75rem` (28) — título da página |
| `--text-3xl` | `2.25rem` (36) — número em destaque (semana, preparo) |

- Títulos (`h1`, `h2`, números em destaque): Fraunces 600, `letter-spacing: -.01em`, `text-wrap: balance`.
- Rótulos em caixa alta: Karla 600, 12px, `letter-spacing: .08em`, `ink-muted`.
- Números em colunas e valores: `tabular-nums`. Sem fonte monoespaçada.

### Espaço, raio, sombra, movimento

- Espaço: `--space-1` … `--space-8` = 4, 8, 12, 16, 20, 24, 32, 40px.
- Raio: `--radius-sm` 8 · `--radius-md` 12 · `--radius-lg` 18 · `--radius-xl` 24 · `--radius-full`.
- Sombra: `--shadow-sm` (card), `--shadow-md` (barra de navegação, aviso), `--shadow-lg` (diálogo).
- Movimento: `--ease` = `cubic-bezier(.2,.7,.2,1)`, `--duration` = 180ms; tudo zerado em `prefers-reduced-motion`.

## 2. Casca única (`AppShell`)

```
┌──────────────────────────────┐        ┌────────┬─────────────────────────┐
│ ninho        [título da tela]│        │ ninho  │ data · h1 título   [AV] │
├──────────────────────────────┤        │        ├─────────────────────────┤
│                              │        │ Início │                         │
│   conteúdo da rota atual     │        │ Lista  │   conteúdo da rota      │
│   (1 coluna; 2 em 600–899)   │        │ Marcos │   (máx. 1080px)         │
│                              │        │ Orçam. │                         │
├──────────────────────────────┤        │ Perfil │                         │
│ Início Lista Marcos Orç. Perf│        └────────┴─────────────────────────┘
└──────────────────────────────┘          ≥ 900px
   < 900px (barra fixa, safe-area)
```

- Configuração única de rotas: `NAV_ITEMS = [{ path, label, icon }]` usada pela barra inferior,
  pela lateral, pelo `h1` e pelo `document.title` ("Lista · Ninho").
- `/recommendations` → destino Lista, sub-aba Inspirações. `/checklist` → Lista › Itens.
- A Lista ganha um controle segmentado `Itens | Inspirações` (`role="tablist"`).
- Some: `Phone`, `activePanel`, `MobileUtilityLinks`, `stage-toolbar`, `DesktopWorkspace`,
  `DesktopSideSummary`, `desktop-welcome`, `desktop-help-button`, `AccountControl` no topo do celular.
- Avatar no topo do desktop leva ao Perfil; "sair da conta" fica só no Perfil.
- Títulos internos dos painéis (`phone-heading`) viram `h2` com a frase de apoio da tela.

## 3. Fita métrica (`Progress`)

Componente único com `role="progressbar"`, `aria-valuenow/min/max` e `aria-label`.

- Trilho `--tape-track` com marcações de centímetro por `repeating-linear-gradient`
  (traço a cada 10%, meio traço a cada 5%).
- Preenchimento `--color-accent` (sage) com as mesmas marcações em branco translúcido.
- Variante `tone="brand"` para o orçamento acima do planejado (vinho).
- Altura 10px (padrão) e 16px (`size="lg"`, Visão geral e gestação).

## 4. Visão geral (A5)

1. **Cabeçalho da gestação** — "Olá, Ana" (ou "Olá" sem nome) · `semana 25 · 6 dias` em
   Fraunces 36 · "faltam 14 semanas para 20 de dezembro" · aviso de chegada quando passou.
   Sem data prevista: convite para configurar no Perfil.
2. **Preparo** — "18% do enxoval resolvido" (um número só) + fita lg + "2 de 11 itens".
3. **Por categoria** — 4 linhas com nome, `resolvidos/total` e fita.
4. **Grade de cards** (2 colunas a partir de 600px): próximo marco (com estado atrasado),
   orçamento (investido de planejado + fita), próximo item essencial.
5. Atalho para Inspirações (Lista › Inspirações).

## 5. Estratégia para o CSS

Reescrever `index.css` por camadas, em vez de editar 1.311 linhas com duplicatas:

1. `@layer base` — tokens, reset, tipografia, foco, movimento reduzido.
2. `@layer components` — um bloco por componente (botões, campos, pills, cards, diálogos,
   fita, avisos, status, itens, marcos, orçamento, inspirações, perfil, presentes, auth).
3. `@layer layout` — casca, barra inferior, lateral, breakpoints 600 e 900.

Garantia de cobertura: um script lista toda `className` usada em `App.tsx`, `pages/` e
`components/` e confere que cada uma existe no novo CSS (e vice-versa, para achar sobras).

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Reescrita esquece o estilo de algum estado raro (reserva de presente, erro de catálogo) | Script de cobertura de classes + passada visual em todas as rotas e na página pública |
| Troca da casca quebra rotas e testes `data-testid` | Manter os `data-testid` existentes das abas; mapear rotas antigas |
| Contraste de estados compostos (texto sobre fita, sobre imagem) | Script mede contra o fundo efetivo, subindo na árvore até achar cor opaca |
| Fraunces pesada | Só 2 pesos, `display=swap`, fallback serifado do sistema |
