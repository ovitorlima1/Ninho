# Fase 1 — validação (2026-09-12)

Branch `fase-0-correcoes-urgentes` (a mesma da Fase 0, ainda sem merge).

## Gates

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | 4 pacotes, 0 erros |
| `pnpm --filter @workspace/ninho run test` | 20 testes (6 recomendações + 7 orçamento + 7 gestação), 0 falhas |
| `pnpm --filter @workspace/api-server run test` | 5 testes, 0 falhas |
| Build de produção | ok — JS 426,76 kB (132,82 gzip), CSS 154,32 kB (29,27 gzip) |

## Critérios de aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | Marcar "Comprado" e voltar para "A comprar" em 2 toques | ✅ sem passar por "Ganhei" (verificado via API: Comprado → A comprar) |
| 2 | Adicionar item com quantidade e preço | ✅ formulário com quantidade e preço unitário; a linha mostra "2 un. × R$ 45,00 · R$ 90,00" |
| 3 | Editar preço reflete no orçamento | ✅ Macacão comprado (5 × R$ 74) = R$ 370,00 na Visão geral e no Orçamento |
| 4 | Teclado e Esc | ✅ foco inicial no primeiro campo, foco preso, Esc fecha e o foco volta ao botão de origem (add e editar item, confirmar) |
| 5 | Sessão expirada | ✅ 401 leva a /sign-in?expirou=1 com o aviso "Sua sessão expirou" |
| 6 | Data prevista no passado | ✅ "semana 40", 100% e o aviso "A chegada pode ser a qualquer momento" com link para o perfil |
| 7 | Desfazer na remoção | ✅ item removido e restaurado com a mesma quantidade e preço |
| 8 | Gates | ✅ tabela acima |

Extra: nenhuma fonte abaixo de 12px e nenhum estouro horizontal em 375px depois das telas novas.

## Ajustes não previstos

- O aviso com "Desfazer" sumia em 3,2s (tempo do aviso comum); com ação passou para 8s.
- A remoção mostrava dois avisos (um da mutation, outro do handler); ficou só o que traz o "Desfazer".
- O foco não voltava ao botão de origem porque o React recria o botão enquanto o diálogo está aberto; o diálogo passou a receber o `data-testid` de quem o abriu.
- Removidas as 334 linhas comentadas do `Workspace` no `App.tsx` (A11, que é da Fase 3): a cópia dobrava o risco de editar o lugar errado.

## Fora de escopo, observado

- O `App.tsx` continua com ~2.700 linhas — a quebra em módulos é da Fase 3.
- Os nomes de tela ainda variam (Início/Visão geral, Marcos/Linha do tempo) — M4, Fase 2.
- O grid de inspirações continua com duas colunas em telas estreitas — Fase 2.
