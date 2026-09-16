# Fase 2 — Design system, identidade e navegação

**Tamanho:** Complex (identidade nova + casca de navegação + reescrita do CSS).
**Design:** `design.md` (tokens, casca, componentes).
**Origem:** auditoria "Raio-X do Ninho" — A1, A5, A10, M3, M4, M6, M8, M11, M12.
**Depende de:** Fases 0 e 1 (branch `fase-0-correcoes-urgentes`).

## Problema

A identidade atual não tem sistema por trás (313 cores soltas, cerca de 40 tamanhos de fonte,
blocos de CSS duplicados que quebram componentes) e não é a direção aprovada no PRD. O
celular renderiza três "telefones" ao mesmo tempo, o desktop tem outra casca, e a mesma tela
tem até três nomes. No tablet aparece o layout de celular esticado. O contraste do texto de
apoio e do botão principal está abaixo de AA.

## Decisões de produto (2026-09-16)

1. **Identidade do PRD (seção 10):** paleta terrosa/ivory com sage e vinho, Fraunces nos
   títulos, Karla no corpo, barra "fita métrica" como elemento de progresso.
2. **Navegação com 5 destinos:** Início, Lista, Marcos, Orçamento, Perfil — os mesmos nomes no
   celular e no desktop. Inspirações vira uma aba dentro da Lista. "Sair" vai para o Perfil.

## Requisitos

### Tokens e CSS (A10, M12)

| ID | Requisito | Achado |
|---|---|---|
| F2-R1 | Todas as cores do app vêm de tokens semânticos (`--color-*`); nenhum hex ou rgba literal fora de `src/styles/tokens.css`. | A10 |
| F2-R2 | Escala tipográfica única em rem (12, 14, 16, 18, 22, 28, 36); nenhum `font-size` fora dela. Texto de corpo com 16px. | A10 |
| F2-R3 | Espaçamento, raio (5 valores) e sombra (3 valores) por token. | A10 |
| F2-R4 | Cada componente tem um único bloco de regras; sem `!important` (a única exceção é o bloco de movimento reduzido, padrão reconhecido) e sem blocos duplicados. Classes que o app não usa são removidas. | A10 |
| F2-R5 | Fonte monoespaçada sai do app; números usam `font-variant-numeric: tabular-nums`. | M12 |

### Identidade (PRD)

| ID | Requisito | Achado |
|---|---|---|
| F2-R6 | Paleta, tipografia e marca (logo, favicon, imagem do login) seguem a direção do PRD. | PRD §10 |
| F2-R7 | Todo progresso (geral, por categoria, orçamento, gestação) usa o componente "fita métrica". | PRD §4.1 |

### Contraste e toque (A1, M6)

| ID | Requisito | Achado |
|---|---|---|
| F2-R8 | Todo texto visível tem contraste ≥ 4,5:1 (≥ 3:1 para 18px+ ou 14px+ em negrito) sobre o fundo real; bordas de campo e controles ≥ 3:1. Medido por script no navegador. | A1 |
| F2-R9 | Todo controle interativo tem área ≥ 44×44px em telas de toque e ≥ 24×24px no desktop. | M6 |

### Navegação e layout (M3, M4)

| ID | Requisito | Achado |
|---|---|---|
| F2-R10 | Uma casca única: barra inferior com 5 destinos no celular e no tablet; barra lateral com os mesmos 5 no desktop. Cada tela tem um nome só, usado no título da página (`document.title`), na navegação e no `h1`. | M4 |
| F2-R11 | Só a tela atual é renderizada (fim dos três painéis simultâneos). Rotas antigas continuam funcionando (`/recommendations` abre Lista › Inspirações). | M4 |
| F2-R12 | Entre 600 e 899px o conteúdo usa duas colunas onde houver cards lado a lado; nada estica além de 720px por coluna de leitura. Sem rolagem horizontal de 320 a 1440px. | M3 |
| F2-R13 | Uma `h1` por página, um `<main>` e navegação com `aria-current="page"`. | M4 |

### Visão geral (A5)

| ID | Requisito | Achado |
|---|---|---|
| F2-R14 | A Visão geral mostra a semana e os dias em destaque, o preparo uma vez só (com fita métrica), o progresso por categoria, o próximo marco (incluindo atrasado), o orçamento e o próximo item essencial. Sem data repetida, sem gráfico decorativo, sem "Bem-vinda de volta" para conta nova. | A5 |
| F2-R15 | O avatar usa as iniciais do nome do perfil (não do e-mail). | A5 |

### Fontes e movimento (M8, M11)

| ID | Requisito | Achado |
|---|---|---|
| F2-R16 | Fontes carregadas por `<link>` no HTML com `preconnect`, só os pesos usados, `display=swap` e pilha de fallback do sistema; sem Inter e sem `@import` no CSS. | M8 |
| F2-R17 | Com `prefers-reduced-motion: reduce`, animações e transições ficam desligadas; efeitos de hover só em `(hover: hover)`. | M11 |

## Fora de escopo

- Modo escuro (os tokens deixam pronto, mas a paleta escura não entra agora).
- Quebrar `App.tsx` em módulos e remover dependências → Fase 3.
- Gamificação do PRD (badges, sequência semanal) → feature própria.

## Critérios de aceite (fase)

1. `grep` nos estilos fora de `tokens.css`: 0 hex/rgba literais e 0 `!important` fora do bloco de movimento reduzido.
2. Script de contraste: 0 falhas nas telas logadas, de acesso e na página pública de presentes, em 375 e 1280px.
3. Script de alvos de toque: 0 controles abaixo de 44×44 em 375px (touch).
4. 5 destinos com os mesmos nomes no celular e no desktop; `/recommendations` abre Lista › Inspirações.
5. Sem rolagem horizontal em 320, 375, 768, 1024 e 1440px; duas colunas em 768px.
6. Nenhuma fonte abaixo de 12px (mantém a Fase 0) e nenhuma fonte monoespaçada.
7. Gates: typecheck, testes do front e da API, build.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| F2-R16, R17 | T1 | pendente |
| F2-R10, R11, R13 | T2 | pendente |
| F2-R1–R6, R9, R12 | T3 | pendente |
| F2-R7, R14, R15 | T4 | pendente |
| F2-R8 | T5 | pendente |
| — | T6 (validação) | pendente |
