# Fase 0 — Correções urgentes

**Tamanho:** Large (7 achados, 3 áreas: CSS/UI, regra de negócio no front, API).
**Design:** inline (sem decisões de arquitetura novas; decisões registradas em STATE.md).
**Origem:** auditoria "Raio-X do Ninho" (2026-09-11), achados C1–C5, A2, A9.
**Prazo duro:** 2026-09-24 (catálogo de inspirações vence — C4).

## Problema

A usuária não consegue ler partes do app (textos de 5–9px com zoom bloqueado), vê um
"investido" errado no orçamento, não encontra como remover itens no celular, e em 13 dias a
aba Inspirações fica vazia. A recuperação de senha pode ser usada para disparar e-mails em massa.

## Requisitos

### Legibilidade (C1, C2, A2)

| ID | Requisito | Achado |
|---|---|---|
| F0-R1 | O viewport não bloqueia zoom (sem `maximum-scale`/`user-scalable=no`). | C1 |
| F0-R2 | O documento declara `lang="pt-BR"`. | A2 |
| F0-R3 | Todo `input`, `textarea` e `select` tem tamanho de fonte computado ≥ 16px em qualquer largura (evita o zoom automático do iOS). | C1 |
| F0-R4 | Nenhum texto visível tem fonte computada < 12px em 375px e 1280px nas telas: login, cadastro, recuperar senha, onboarding, Visão geral, Lista, Linha do tempo, Inspirações, Orçamento, Perfil e página pública de presentes. | C1 |
| F0-R5 | As regras de "Timeline rhythm and readability" (`index.css`) valem para o painel Linha do tempo; o painel Visão geral não recebe mais a classe `timeline-panel`. | C2 |

### Orçamento (C3)

| ID | Requisito | Achado |
|---|---|---|
| F0-R6 | "Investido" = Σ (preço unitário × quantidade) dos itens com status **Comprado**. Itens **Ganhei** e **A comprar** não entram. | C3 |
| F0-R7 | O cálculo é feito em centavos inteiros por um único selector puro, usado pela Visão geral e pelo Orçamento (fim da duplicação em `App.tsx:507` e `:839`). | C3 |
| F0-R8 | Testes unitários cobrem: presente excluído, multiplicação por quantidade, arredondamento em centavos (ex.: 0,1 + 0,2), lista vazia, preço 0. | C3 |

### Inspirações (C4)

| ID | Requisito | Achado |
|---|---|---|
| F0-R9 | Os itens visíveis do catálogo têm `reviewedAt = 2026-09-11` e `expiresAt = 2026-12-10` (≥ 60 dias). | C4 |
| F0-R10 | `getNextRecommendationRefreshDelay` nunca retorna mais que 1h (3.600.000 ms) nem menos que 1 ms. | C4 |
| F0-R11 | Um teste falha quando algum item visível tem menos de 14 dias de validade a partir da data atual (alerta de vencimento). | C4 |
| F0-R12 | Os testes existentes deixam de depender de datas fixas que já passaram (usam as datas do próprio catálogo). | C4 |

### Remover item (C5)

| ID | Requisito | Achado |
|---|---|---|
| F0-R13 | Em dispositivos sem hover (`hover: none`), o botão de remover fica sempre visível, com área de toque ≥ 44×44px. | C5 |
| F0-R14 | Com teclado, o botão aparece quando a linha tem foco (`:focus-within`). No desktop com mouse, o comportamento de hover continua. | C5 |

### Recuperação de senha (A9)

| ID | Requisito | Achado |
|---|---|---|
| F0-R15 | `POST /api/auth/password-reset/request` aceita no máximo 3 pedidos por hora por e-mail e 10 por hora por IP. | A9 |
| F0-R16 | Acima do limite: HTTP 429, header `Retry-After` e mensagem em pt-BR (exibida pela tela "Esqueceu sua senha?"). | A9 |
| F0-R17 | O limite conta igual para e-mail com ou sem conta (não revela se a conta existe). E-mails inválidos (400) não consomem tentativas. | A9 |
| F0-R18 | Testes unitários cobrem os dois limites e a liberação após a janela. | A9 |

## Fora de escopo

- Contraste (A1), tokens e escala tipográfica completa (A10) → Fase 2. Aqui só o piso de 12px.
- Limitador persistente para autoscale → Fase 4.
- Edição de preço/quantidade (A4) → Fase 1.

## Critérios de aceite (fase)

1. Script de medição no navegador: 0 elementos visíveis com fonte < 12px em 375px e 1280px nas telas de F0-R4.
2. `pnpm run typecheck` passa; testes do front (recomendações + orçamento) e da API (limitador) passam; build de produção passa.
3. Pinch-zoom liberado (meta viewport) e `lang="pt-BR"`.
4. Cenário da auditoria: Body (6 × R$38, Ganhei) + Macacão (5 × R$74, Comprado) → "Investido" = **R$ 370,00** nas duas telas.
5. Aba Inspirações mostra os 8 itens com "revisado em 11 de setembro de 2026".
6. 4º pedido de reset para o mesmo e-mail em 1h → 429 com mensagem visível na tela.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| F0-R1, R2, R3 | T2 | concluído (1d38d67) |
| F0-R4 | T3 | concluído (3b6e594) |
| F0-R5 | T1 | concluído (bb5209a) |
| F0-R6, R7, R8 | T5 | concluído (0b83a1f) |
| F0-R9, R10, R11, R12 | T6 | concluído (e094dec) |
| F0-R13, R14 | T4 | concluído (d851b70) |
| F0-R15, R16, R17, R18 | T7 | concluído (951d38d) |
