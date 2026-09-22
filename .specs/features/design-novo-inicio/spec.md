# Design novo: base global e tela inicial

**Tamanho:** Large (tokens, fonte, marca, casca de navegação e uma tela; várias camadas de CSS).
**Origem:** pedido do dono em 2026-09-22 — "começa a aplicar o design novo pela tela inicial".
**Referências:**
- Design system "Ninho Bento": https://claude.ai/artifact/43t7uK7KSLg2qaQhbaLqjs
- Canvas "Ninho · Telas", etapa 2 (Início no celular e no computador): https://claude.ai/artifact/LC23F4YQ2QhTzVc42TPdHA
- Página de acompanhamento: https://claude.ai/artifact/UBfs6PnqqFvNb8PQbxTBSG (itens d01–d04 e d06)

## Decisões (2026-09-22)

1. **Base global + Início.** Cores, fonte, logo, barra de progresso lisa e navegação nova valem para
   o app todo nesta entrega; o layout novo em blocos entra só no Início. As outras telas ganham a
   cara nova com a estrutura atual até a vez delas. (Escolha do dono entre isso e "só o Início".)
2. **Web app só no navegador**, sem instalação: nada de manifesto, service worker ou modo standalone.
   Alturas de tela cheia em `dvh`; áreas seguras do iPhone respeitadas.
3. **Faixas responsivas do design system:** celular até 599px (barra flutuante no rodapé), tablet
   600–1023px (trilho de ícones à esquerda), computador a partir de 1024px (barra lateral) e duas
   colunas no Início a partir de 1280px. Sem telas de iPad no canvas: o tablet é garantido no código.
4. **Nomes de tokens mantidos.** `tokens.css` continua com os nomes atuais (`--color-brand`, `--color-bg`…)
   recebendo os valores do Ninho Bento, mais os tokens novos (`--color-tile-*`, `--color-nav-*`,
   `--color-mark-*`). Assim as telas antigas mudam de cor sem reescrever o `components.css`.
5. **Bloco pêssego do Início = próximo marco.** O canvas mostra "Chá de bebê · 12 dias", mas o app
   ainda não tem evento de chá (é da feature de listas de presentes). Até lá o bloco mostra o próximo
   marco da linha do tempo, que existe hoje. O bloco manteiga mostra as inspirações.
6. **Modo escuro fica fora** (item r03 do diagnóstico): a paleta escura existe no design system, mas
   o app continua `color-scheme: light`.

## Requisitos

| ID | Requisito |
|---|---|
| DN-R1 | `tokens.css` usa a paleta do Ninho Bento (tema claro): fundo `#f8f3f6`, superfícies brancas, ação ameixa `#82376f` (hover `#6a2a5b`), malva `#efd6e8` para destaque, pêssego, menta e manteiga com texto `on-*` próprio, progresso `#b0569a` sobre trilho `#efe2eb`, raios 10/16/22/28px e sombras em tom ameixa. |
| DN-R2 | Plus Jakarta Sans em todo o app (400–800), carregada do Google Fonts como a Montserrat era; Montserrat sai. |
| DN-R3 | A barra de progresso é uma pílula lisa, sem marcações de centímetro, em todos os usos (Início, categorias, orçamento, cartões, login e inspirações). O componente continua com `role="progressbar"` e `aria-label`. |
| DN-R4 | A marca usa a logo nova (ninho que acolhe: traços ameixa, coração pêssego, quadrado creme) no cabeçalho, na barra lateral, no trilho, na tela de acesso e no favicon; o nome aparece como "Ninho". O `public/logo.svg` antigo (paleta vinho) é substituído. |
| DN-R5 | Navegação por faixa: abaixo de 600px, barra escura flutuante no rodapé com o item ativo em pílula malva e rótulo visível (os outros só com ícone, rótulo acessível); de 600 a 1023px, trilho de 88px à esquerda com ícone e rótulo; a partir de 1024px, barra lateral de 248px. Os `data-testid` atuais continuam (`button-phone-tab-*`, `button-sidebar-*`); o trilho ganha `button-rail-*`. |
| DN-R6 | Início em blocos: saudação com a semana (`.overview-week`) e o tempo que falta; bloco malva do enxoval (porcentagem, barra e itens resolvidos) ocupando a largura no celular e 2×2 a partir de 600px; bloco pêssego do próximo marco (com estado de atrasado em aviso); bloco menta do orçamento; bloco manteiga das inspirações; cartão "Para comprar agora" com até 3 itens pendentes (essenciais primeiro); cartão "Por categoria" com o progresso das quatro categorias. A partir de 1280px, "Por categoria" vai para uma coluna à direita de 340px. |
| DN-R7 | Os caminhos do Início continuam: cada bloco e item leva à tela certa, com os `data-testid` atuais (`button-open-overview-list`, `-milestones`, `-budget`, `button-overview-next-item`, `button-open-recommendations`, `button-overview-set-due-date`); sem data prevista, o Início convida a informá-la; data vencida mostra o aviso de chegada. |
| DN-R8 | Acessibilidade mantida: contraste AA em todo texto (4,5:1; 3:1 para bordas e ícones), alvos de 44px, foco visível, `h1` da tela igual ao nome na navegação, `prefers-reduced-motion` respeitado. |
| DN-R9 | Sem rolagem horizontal da página em 320, 390, 834, 1024 e 1280px. |

## Fora de escopo

- Layout novo das outras telas (Lista, Marcos, Orçamento, Perfil, acesso): próximos itens do diagnóstico.
- Modo escuro.
- Evento de chá, listas de presentes, link e foto de produto.

## Critérios de aceite

1. Capturas do Início em 390, 834, 1024 e 1280px batem com a etapa 2 do canvas, na medida dos dados reais.
2. `pnpm lint`, `pnpm run typecheck`, `pnpm test`, build e `pnpm test:e2e` verdes (axe sem violações sérias ou críticas).
3. Nenhuma cor literal fora de `tokens.css` (regra da Fase 2).

## Rastreio

| Requisito | Status |
|---|---|
| DN-R1–R2 | pendente |
| DN-R3 | pendente |
| DN-R4 | pendente |
| DN-R5 | pendente |
| DN-R6–R7 | pendente |
| DN-R8–R9 | pendente |
