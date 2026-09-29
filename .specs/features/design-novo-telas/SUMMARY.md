# Resumo — design novo nas outras telas

**Branch:** `design-novo-telas` (a partir de `design-novo-inicio`) · **Data:** 2026-09-23

## Entregue

| Commit | O quê | Req. |
|---|---|---|
| `6cb7cdc` | textos em caixa normal (24 rótulos e kickers em 12 arquivos), `CategoryBadge` com a cor da categoria, login sem enfeite de barra | DT-R1, DT-R6 |
| `83efeb4` | Lista (progresso no topo, chips com ícone, selo Essencial, "seu progresso" malva) e Marcos (bloco do próximo marco) | DT-R2, DT-R3 |
| `756bfa4` | Orçamento: bloco menta, ícones, barras verdes/vermelhas, aviso de categoria estourada (`calcOverBudget`, com teste) | DT-R4 |
| `dd3ad82` | Perfil: iniciais iguais às do topo, presentes em bloco pêssego, botões em pílula | DT-R5 |
| `150f496` | "Voltar" do onboarding à esquerda (B3), carregando no visual novo | DT-R6 |

## Verificação

- lint, typecheck, `pnpm test` (front 26, API 17), build: verdes.
- `pnpm test:e2e`: **54/54** com axe.
- Rolagem lateral medida em Início, Lista, Marcos, Orçamento, Perfil e Inspirações a 320, 390, 834, 1024 e 1280px: **nenhuma**.
- Capturas: `screenshots/telas-design-novo-celular.jpg` e `-computador.jpg` (spec temporário no banco `ninho_test`, apagado).

## Mantido de propósito

Seletor de 3 status na Lista (A3/A4), valores planejados editáveis no Orçamento, grade de semanas nos Marcos,
os 7 campos do Perfil. Busca e tabela na Lista, várias listas de presentes e evento de chá ficam para as features próprias.
