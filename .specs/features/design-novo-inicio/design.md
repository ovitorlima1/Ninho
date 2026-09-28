# Design — design novo: base global e tela inicial

## Camadas tocadas

```
index.html ─ fonte (Plus Jakarta Sans), theme-color, favicon
styles/tokens.css ─ valores do Ninho Bento com os nomes atuais + tokens novos
styles/components.css ─ marca, barra de progresso lisa, blocos do Início
styles/layout.css ─ casca: rodapé flutuante <600, trilho 600–1023, lateral ≥1024
components/brand.tsx ─ logo nova (<img> do public/)
components/progress.tsx ─ mesmo markup, sem mudança de API
layout/app-shell.tsx ─ trilho (variante "rail" de NavLinks)
features/overview/overview-panel.tsx ─ blocos + "Para comprar agora" + "Por categoria"
lib/overview.ts (novo) ─ regras puras do Início, com teste
public/ ─ ninho-icon.svg, favicon.svg, logo.svg
```

## Tokens

Os nomes atuais ficam; mudam os valores (tema claro do design system) e entram tokens novos:

| Token atual | Valor novo | Papel no design system |
|---|---|---|
| `--color-bg` | `#f8f3f6` | `surface` |
| `--color-surface` | `#ffffff` | `surface-raised` |
| `--color-surface-sunk` | `#f2e9ef` | `surface-sunk` |
| `--color-line` / `--color-line-strong` | `#ebdee6` / `#94818d` | `line` / `line-strong` |
| `--color-ink` / `--color-ink-muted` | `#2a1c26` / `#6c5c67` | `ink` / `ink-muted` |
| `--color-brand` / `--color-brand-strong` | `#82376f` / `#6a2a5b` | `brand` / `brand-strong` |
| `--color-brand-soft` | `#efd6e8` | `tile-lilac` (malva) |
| `--color-brand-vivid`, `--color-progress` | `#b0569a` | `progress` |
| `--color-brand-gradient` | ameixa sólida | botão principal sem degradê |
| `--color-highlight` | `#f4ba9a` | destaque pêssego sobre o painel escuro do login |
| `--color-accent*` | `#2f6e4e` (strong), `#cfebdd` (soft) | `success`, `tile-mint` |
| `--color-danger*` | `#a63a4f` / `#fbeaee` | `danger` |
| `--tape-track` | `#efe2eb` | `progress-track` (as marcações `--tape-tick*` saem) |

Novos: `--color-tile-{lilac,peach,mint,butter}` e `--color-on-tile-*`, `--color-nav`, `--color-nav-muted`,
`--color-nav-active`, `--color-on-nav-active`, `--color-mark-{bg,line,heart}`, `--shadow-float`,
`--rail-width: 88px`; `--sidebar-width` vai a 248px e `--content-max` a 1120px; raios 10/16/22/28px.

## Casca (layout.css)

| Faixa | Navegação | Cabeçalho |
|---|---|---|
| < 600px | `.app-tabbar` fixa, pílula escura flutuando 16px acima do rodapé (+ `safe-area-inset-bottom`); item ativo em pílula `nav-active` com rótulo; inativos só ícone, rótulo em `.visually-hidden` | marca + `h1` + avatar |
| 600–1023px | `.app-rail` (novo) de 88px, sticky, marca no topo e itens com ícone em pílula + rótulo curto | `h1` + avatar (marca no trilho) |
| ≥ 1024px | `.app-sidebar` de 248px (já existe; muda o ponto de quebra de 900 para 1024) | data + `h1` + avatar |

`NavLinks` ganha `variant: "rail"` com `data-testid="button-rail-${id}"`. Os testes E2E rodam em 375 e 1280px,
então continuam achando `button-phone-tab-*` e `button-sidebar-*`.

## Início

Regras puras em `lib/overview.ts` (testáveis sem DOM):
- `enxovalProgress(items)` → `{ done, total, toBuy, percent }`.
- `itemsToBuy(items, limit = 3)` → pendentes, essenciais primeiro, na ordem da lista.

Estrutura (mesma ordem em todas as faixas; o grid só reorganiza):

```
.overview
  .overview-hello      saudação (h2), .overview-week (semana) e contagem — ou convite para a data prevista
  ArrivalNotice        quando a data prevista passou
  .overview-bento      [malva: enxoval 2×2] [pêssego: próximo marco] [menta: orçamento] [manteiga: inspirações ×2]
  .overview-buy        cartão "Para comprar agora" (até 3 itens, cada um leva à Lista)
  .overview-aside      cartão "Por categoria" (coluna de 340px a partir de 1280px)
```

Grid do bento: 2 colunas no celular (malva e manteiga ocupam as duas), 4 colunas a partir de 600px
(malva 2×2, manteiga 2 colunas), e a partir de 1280px o Início vira `minmax(0,1fr) 340px` com o bento em
3 colunas (malva 2×2, pêssego e menta empilhados, manteiga na largura), para os valores não quebrarem linha.

## Riscos

- **Contraste:** os pares novos já foram medidos no design system (0 falhas nos dois temas); o axe do E2E confirma nas telas.
- **Telas antigas:** herdam cores, raios e fonte novos sem mudar estrutura; conferir Lista, Perfil e login por captura.
- **Tamanho da logo:** o símbolo vetorizado tem ~20 kB; vai como arquivo em `public/` (cacheado), não embutido no JS.
