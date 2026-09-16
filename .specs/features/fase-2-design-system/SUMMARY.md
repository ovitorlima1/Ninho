# Fase 2 — validação (2026-09-16)

Branch `fase-0-correcoes-urgentes` (continua a das Fases 0 e 1, sem merge).

## Gates

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | 4 pacotes, 0 erros |
| Testes do front | 20 testes, 0 falhas |
| Testes da API | 5 testes, 0 falhas |
| Build de produção | ok — CSS 123,41 kB (**20,46 kB gzip**, antes 29,73) · JS 421,84 kB (131,92 gzip) |

## Critérios de aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | Sem cor literal nem `!important` fora de `tokens.css` (exceto movimento reduzido) | ✅ 0 e 0 |
| 2 | Script de contraste | ✅ 0 falhas: 6 telas logadas, 3 de acesso (inclusive com erros de campo), página pública, diálogo de adicionar item e confirmação de revogar link, em 375 e 1280px |
| 3 | Alvos de toque ≥ 44px em 375px | ✅ 0 abaixo (antes da correção: campos do orçamento com 42px e o link de feedback com 19px) |
| 4 | Cinco destinos com os mesmos nomes; `/recommendations` → Lista › Inspirações | ✅ título da aba, `h1`, barra inferior e lateral conferidos; rota desconhecida cai no Início |
| 5 | Sem rolagem lateral em 320, 375, 768, 1024 e 1440px; duas colunas em 768px | ✅ (antes da correção a Lista rolava para o lado em 375px) |
| 6 | Nenhuma fonte < 12px e nenhuma monoespaçada | ✅ 0 e 0 em todas as telas |
| 7 | Gates | ✅ tabela acima |

## Ajustes não previstos

- **Foto do login:** `login-pregnancy.png` era a captura de um projeto de terceiros ("Pregnancy
  Tracker Logo", com logo e botões de outro produto) que o CSS antigo escondia com recorte.
  Trocada por um painel só com a identidade do Ninho; o arquivo continua em `public/`, sem uso.
- A animação de entrada começava em `opacity: 0`; passou a animar só o deslocamento.
- A Lista rolava para o lado em 375px (coluna `1fr` crescendo até a fila de pílulas).
- Status e lixeira da Lista passaram para uma grade (item em cima, controles embaixo no
  celular; tudo numa linha a partir de 600px).
- Os marcos deixaram de usar as notas fixas do seed ("seu momento") e mostram a distância real.

## Fora de escopo, observado

- Modo escuro (tokens prontos, paleta escura não definida).
- As fotos de Inspirações continuam genéricas e repetidas (M7, Fase 3).
- Lighthouse e axe automatizados entram com o CI (Fase 3).
