# Fase 0 — validação (2026-09-11)

Branch `fase-0-correcoes-urgentes`, a partir de 07b3495.

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `pnpm run typecheck` | 4 pacotes, 0 erros |
| Testes front | `pnpm --filter @workspace/ninho run test` | 13 testes (6 recomendações + 7 orçamento), 0 falhas |
| Testes API | `pnpm --filter @workspace/api-server run test` | 5 testes, 0 falhas |
| Build | `PORT=5180 BASE_PATH=/ pnpm --filter @workspace/ninho run build` | ok — JS 417,87 kB (130,07 gzip), CSS 152,18 kB (28,83 gzip) |

## Critérios de aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | 0 textos < 12px | ✅ medido em 320, 375 e 1024px em Visão geral, Lista, Linha do tempo, Inspirações, Orçamento, Perfil, login, cadastro, recuperar senha e página pública de presentes |
| 2 | Gates verdes | ✅ tabela acima |
| 3 | Zoom liberado e `lang="pt-BR"` | ✅ `width=device-width, initial-scale=1, viewport-fit=cover`; campos com 16px em todas as telas |
| 4 | Body (6 × R$38, Ganhei) + Macacão (5 × R$74, Comprado) = R$ 370,00 | ✅ Visão geral e Orçamento |
| 5 | Inspirações válidas | ✅ 8 itens, "revisado em 11 de setembro de 2026", validade até 2026-12-10 |
| 6 | 4º pedido de reset em 1h → 429 | ✅ `Retry-After: 3600` e mensagem visível na tela "Esqueceu sua senha?" |

Extra verificado: lixeira com opacidade 1 e 44×44px em `hover: none`; sem estouro horizontal em 320px.

## Ajustes não previstos

- `.public-gift-header > span`: com 12px o rótulo quebrava em três linhas dentro dos 150px antigos; `max-width` foi para 200px e o letter-spacing caiu para .04em.

## Fora de escopo, observado durante a validação

- No celular, a grade de inspirações fica em duas colunas até 320px (cards de ~137px) e o selo "combina com sua lista" quebra em duas linhas — tratar na Fase 2 (M3/M7).
- Após o piso de 12px, os rótulos em caixa alta ficaram visualmente pesados em alguns cards; a escala definitiva é da Fase 2 (A10).
