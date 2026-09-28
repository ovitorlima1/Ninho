# Resumo — design novo: base global e tela inicial

**Branch:** `design-novo-inicio` · **Data:** 2026-09-22

## Entregue

| Commit | O quê | Req. |
|---|---|---|
| `e625ecc` | spec, design e tarefas | — |
| `c0b0fbf` | tokens do Ninho Bento com os nomes atuais, Plus Jakarta Sans, `visually-hidden` | DN-R1, DN-R2 |
| `0ce12c5` | logo nova (`public/ninho-icon.svg`, favicon, `logo.svg`) no `Brand` | DN-R4 |
| `48a836f` | navegação: rodapé flutuante < 600px, trilho 600–1023px, lateral ≥ 1024px | DN-R5 |
| `e89c20b` | Início em blocos, barra de progresso lisa, rótulos em caixa normal, `lib/overview.ts` com teste | DN-R3, DN-R6, DN-R7 |

## Verificação

- `pnpm lint`, `pnpm run typecheck`, `pnpm test` (front 25, API 17), build: verdes.
- `pnpm test:e2e`: **54/54** (27 cenários × celular e desktop), com axe sem violações sérias ou críticas.
  Uma falha no caminho: o teste de data vencida procura "A data prevista chegou." — o texto novo tinha
  perdido o ponto final; corrigido antes do commit.
- Rolagem horizontal medida em 320, 390, 834, 1024 e 1280px: **0px** em todas.
- Nenhuma cor literal fora de `tokens.css`.
- Capturas (spec temporário do Playwright no banco `ninho_test`, apagado depois):
  `screenshots/inicio-design-novo-390.jpg`, `-834.jpg`, `-1280.jpg`.
  A 320px a barra do rodapé passou a mostrar só ícones (os cinco não cabiam com o rótulo do item atual).

## Diferenças em relação ao canvas

- Bloco pêssego mostra o **próximo marco** (o app ainda não tem evento de chá).
- Saudação "Olá, Ana." (sem "Bom dia"/"Falta pouco") e a semana com a data prevista por extenso.
- "Para comprar agora" traz até 3 pendentes, essenciais primeiro; "Por categoria" fica ao lado a partir de 1280px.

## Ficou para depois

- Layout novo de Lista, Marcos, Orçamento, Perfil e acesso (itens d05, d07–d11 do diagnóstico).
- Textos que estão em caixa alta no próprio JSX ("QUEM ESTÁ PREPARANDO", "BEM-VINDA DE VOLTA"…) — o CSS
  já não força caixa alta, mas essas strings precisam ser reescritas tela a tela.
- Avatar do Perfil ainda usa as 2 primeiras letras ("AN") e o do topo, primeira e última ("AL") — já listado no CONCERNS.
- Modo escuro.
