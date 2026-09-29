# Design novo nas outras telas

**Tamanho:** Large (cinco telas + diálogos e estados; sem API nova).
**Origem:** pedido do dono em 2026-09-23 — "pode seguir com o restante das implementações", depois de ver o Início.
**Depende de:** `design-novo-inicio` (PR #5: tokens, fonte, logo, navegação e barra lisa já aplicados no app todo).
**Referências:** design system https://claude.ai/artifact/43t7uK7KSLg2qaQhbaLqjs · canvas https://claude.ai/artifact/LC23F4YQ2QhTzVc42TPdHA
(etapas 1, 3 e 4) · diagnóstico https://claude.ai/artifact/UBfs6PnqqFvNb8PQbxTBSG (itens d05, d07–d11).

## Decisões (2026-09-23)

1. **Trazer do canvas o que cabe nos dados e nas decisões atuais.** Nada de função a menos: continuam o seletor
   de 3 status da Lista (decisão A3/A4), os valores planejados editáveis do Orçamento, os 7 campos do Perfil e a
   grade de semanas dos Marcos. O que o canvas mostra e o app ainda não tem (evento de chá, várias listas, busca
   na lista) fica para as features próprias.
2. **Rótulos em caixa normal.** Os textos escritos em caixa alta no JSX ("E-MAIL", "QUEM ESTÁ PREPARANDO"…)
   passam a frase normal, como pede o design system.
3. **Cor por categoria em todo o app:** Roupas = malva, Higiene = menta, Alimentação = pêssego,
   Acessórios = manteiga (a mesma regra dos blocos do design system), num ícone de 40px.

## Requisitos

| ID | Requisito |
|---|---|
| DT-R1 | **Acesso** (entrar, criar conta, recuperar e redefinir senha): rótulos e títulos em caixa normal; sai o enfeite de barra do painel da foto; o resto (foto com véu ameixa, cartão do formulário) segue os tokens novos. |
| DT-R2 | **Lista:** barra de progresso do enxoval no topo com "X de Y itens resolvidos"; filtros de categoria com o ícone na cor da categoria; selo "Essencial" em manteiga nos itens essenciais; o cartão "seu progresso" no visual dos blocos. |
| DT-R3 | **Marcos:** bloco pêssego com o próximo marco (ou atrasado, em aviso) acima da linha do tempo; o cartão da gestação mantém `.gestation-card .card-title` com a semana. |
| DT-R4 | **Orçamento:** "Investido até aqui" num bloco menta (valor completo em `.budget-total strong`); cada categoria com o ícone na cor dela; aviso em `warning` quando alguma categoria passa do planejado, dizendo quanto. |
| DT-R5 | **Perfil:** iniciais iguais às do topo (`initialsFor`, "Ana Lima" → "AL"); rótulos em caixa normal; lista para presentes num bloco pêssego; "Sua conta" como lista de ações. |
| DT-R6 | **Diálogos, onboarding e estados:** títulos e rótulos em caixa normal; "Voltar" do onboarding à esquerda (achado B3); carregando/erro/vazio com os tokens novos. |
| DT-R7 | Acessibilidade e responsividade como no Início: AA, alvos de 44px, foco visível, sem rolagem horizontal em 320, 390, 834, 1024 e 1280px. |

## Fora de escopo

- Várias listas de presentes, evento de chá, busca e tabela na Lista, link e foto de produto.
- Modo escuro.

## Critérios de aceite

1. Capturas de cada tela em 390 e 1280px conferidas com o canvas.
2. `pnpm lint`, `typecheck`, `test`, build e `test:e2e` verdes.
3. Nenhuma cor literal fora de `tokens.css`; nenhum texto em caixa alta forçada.

## Rastreio

| Requisito | Status |
|---|---|
| DT-R1 | concluído (`6cb7cdc`) |
| DT-R2 | concluído (`83efeb4`) |
| DT-R3 | concluído (`83efeb4`) |
| DT-R4 | concluído (`756bfa4`) |
| DT-R5 | concluído (`dd3ad82`) |
| DT-R6 | concluído (`6cb7cdc, 150f496`) |
| DT-R7 | concluído (54/54 E2E com axe; sem rolagem lateral em 320–1280px nas 6 telas) |
