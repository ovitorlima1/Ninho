# Fase 1 — Fluxos do dia a dia

**Tamanho:** Large (11 achados, front-end + pequenas mudanças de rota).
**Design:** inline; decisões de produto tomadas com o usuário em 2026-09-12 (ver STATE.md).
**Origem:** auditoria "Raio-X do Ninho" — A3, A4, A6, A7, A8, M1, M2, M5, M13, M14, B1.
**Depende de:** Fase 0 (concluída, branch `fase-0-correcoes-urgentes`).

## Problema

A lista é a tela que a usuária abre toda semana, e hoje ela esconde o que faz: o status muda
num ciclo invisível, não dá para informar preço nem quantidade, e o app não avisa quando algo
falha (onboarding em silêncio, sessão expirada virando "verifique sua conexão").

## Decisões de produto

1. **Status visível + toque edita** — cada linha mostra as três opções de status; tocar no
   resto da linha abre uma folha de edição (nome, quantidade, preço, categoria).
2. **Semana trava em 40** — passada a data prevista, o app mostra "semana 40 · a chegada pode
   ser a qualquer momento" e um aviso discreto perguntando se o bebê nasceu, com link para o
   perfil. Sem campo novo no banco (modo pós-parto fica para outra feature).

## Requisitos

### Lista e item (A3, A4)

| ID | Requisito | Achado |
|---|---|---|
| F1-R1 | Cada item mostra as três opções de status (A comprar / Comprado / Ganhei) como controle explícito, com `role="radiogroup"`, operável por teclado. Não existe mais ciclo por toque. | A3 |
| F1-R2 | Enquanto uma gravação está em andamento, só a linha afetada fica desabilitada; o resto da lista continua utilizável e o foco não se perde. | A3 |
| F1-R3 | Tocar na área de nome do item abre a folha de edição com nome, quantidade, preço unitário (R$) e categoria; salvar usa `PATCH /api/me/checklist/:id` (a API já aceita esses campos). | A4 |
| F1-R4 | "Adicionar item" pede nome, quantidade e preço unitário (os dois últimos opcionais), envia com Enter e só fecha depois do sucesso; em erro, mantém o que foi digitado e mostra a mensagem. | A4, A6 |
| F1-R5 | Preço é sempre unitário e a lista deixa isso explícito (ex.: "6 un. × R$ 38,00 · R$ 228,00"). | A4, C3 |

### Diálogos (A6)

| ID | Requisito | Achado |
|---|---|---|
| F1-R6 | Todos os modais (adicionar item, editar item, presente, inspiração, onboarding) usam um componente único com `role="dialog"`, `aria-modal`, título associado, foco inicial no primeiro campo, foco preso, fechamento por Esc e retorno do foco ao elemento de origem. | A6 |
| F1-R7 | Todo formulário em modal envia com Enter. | A6 |

### Onboarding (A7)

| ID | Requisito | Achado |
|---|---|---|
| F1-R8 | Falha ao salvar o perfil mostra mensagem de erro no modal e mantém a usuária no passo. | A7 |
| F1-R9 | A data prevista aceita apenas entre hoje − 6 semanas e hoje + 42 semanas; fora disso, mensagem explicando. Data incompleta não é descartada em silêncio. | A7, M5 |
| F1-R10 | "Entrar no meu ninho" exige data válida; "configurar depois" continua sendo o caminho para pular. | A7 |

### Sessão (A8)

| ID | Requisito | Achado |
|---|---|---|
| F1-R11 | Qualquer 401 em query ou mutation limpa o cache e leva para `/sign-in`, com aviso "sua sessão expirou, entre de novo". Não existe mais "verifique sua conexão" para sessão expirada. | A8 |

### Formulários de acesso (M1)

| ID | Requisito | Achado |
|---|---|---|
| F1-R12 | Login, cadastro e recuperação validam por campo, com `aria-invalid`, `aria-describedby` e foco no primeiro campo com erro. E-mail inválido e senhas diferentes são sinalizados junto. | M1 |
| F1-R13 | A regra de senha ("pelo menos 8 caracteres") aparece como texto fixo abaixo do campo, não só no placeholder. | M1 |
| F1-R14 | O login não recusa senha curta no cliente (a rejeição é do servidor), para não bloquear contas antigas com mensagem enganosa. | M1 |

### Orçamento (M2)

| ID | Requisito | Achado |
|---|---|---|
| F1-R15 | Os campos mostram R$, aceitam vírgula decimal, usam `inputMode="decimal"`, recusam negativo no cliente e têm foco visível. | M2 |
| F1-R16 | Cada categoria mostra gasto × planejado (usando `calcSpentByCategory`), e o total mostra os dois. | M2 |
| F1-R17 | Erro de gravação aparece uma vez só, ao lado do que falhou, e some ao trocar de tela. | M2 |

### Marcos e semana (M5)

| ID | Requisito | Achado |
|---|---|---|
| F1-R18 | `calcGestationalWeek` usa `floor` e devolve também os dias ("semana 26 · 4 dias"); testes cobrem virada de semana, fuso e data no passado. | M5 |
| F1-R19 | Passada a data prevista, o app mostra "semana 40 · a chegada pode ser a qualquer momento" e um aviso perguntando se o bebê nasceu, com link para o perfil. | M5 |
| F1-R20 | Marco de semana já passada e não concluído aparece como "atrasado" (não esmaecido como se estivesse feito) e continua sendo o "próximo marco" até ser concluído. | M5 |

### Ações destrutivas (M13)

| ID | Requisito | Achado |
|---|---|---|
| F1-R21 | Remover item não usa `window.confirm`: remove na hora e oferece "Desfazer" por 5s no aviso. | M13 |
| F1-R22 | "Revogar link" e "gerar novo link" pedem confirmação em diálogo, explicando que o link atual para de funcionar. | M13 |

### Perfil e mensagens (M14, B1)

| ID | Requisito | Achado |
|---|---|---|
| F1-R23 | O perfil é sempre editável; "salvar" aparece quando há alteração e some depois de salvar. Uma confirmação só (fim do "salvo com carinho" + toast). | M14, B2 |
| F1-R24 | O card "Lista para presentes" fica alinhado (ícone, texto e botão na mesma grade). | M14 |
| F1-R25 | Página 404 e ErrorBoundary em pt-BR, com caminho de volta; `meta description` real; erros de API nunca mostram "HTTP 400 Bad Request" para a usuária. | B1 |

## Fora de escopo

- Contraste, tokens, escala tipográfica, navegação e nomes de tela → Fase 2.
- Modo pós-parto com campo no banco → feature própria.
- Quebrar o `App.tsx`, CI e testes E2E → Fase 3.

## Critérios de aceite (fase)

1. Marcar "Comprado" e voltar para "A comprar" em 2 toques, sem passar por "Ganhei".
2. Adicionar "Manta" com 2 un. × R$ 45,00 e ver R$ 90,00 somados ao investido.
3. Editar o preço de um item existente e ver o orçamento acompanhar.
4. Toda a lista, o orçamento e o perfil operáveis só com teclado; Esc fecha qualquer modal e o foco volta.
5. Com a sessão expirada (cookie apagado), a próxima ação leva ao login com aviso.
6. Data prevista no passado: "semana 40 · a chegada pode ser a qualquer momento".
7. Remover item mostra "Desfazer" e o desfazer restaura o item.
8. `pnpm run typecheck`, testes do front e da API e build passam.

## Rastreio

| Requisito | Tarefa | Status |
|---|---|---|
| F1-R6, R7 | T1 | concluído (44e120c, 7af5048) |
| F1-R1, R2, R5 | T2 | concluído (44e120c) |
| F1-R3, R4 | T3 | concluído (44e120c) |
| F1-R8, R9, R10 | T4 | concluído (44e120c) |
| F1-R11 | T5 | concluído (85406e8) |
| F1-R12, R13, R14 | T6 | concluído (85406e8) |
| F1-R15, R16, R17 | T7 | concluído (3f225e3) |
| F1-R18, R19, R20 | T8 | concluído (133721a, 3f225e3) |
| F1-R21, R22 | T9 | concluído (44e120c, 3f225e3) |
| F1-R23, R24, R25 | T10 | concluído (3f225e3) |
| — | T11 (validação) | concluído (este commit) |
