# Busca na Lista

**Tamanho:** Medium (uma tela, uma regra pura, sem API nova). Design e tarefas inline.
**Origem:** pedido do dono em 2026-09-29 — "pode seguir com a busca na lista" (item r08 do diagnóstico,
canvas 3.3 original: campo "Buscar item" no topo da Lista).
**Fora desta entrega:** a visão em tabela no computador (a outra metade do r08) vira item próprio.

## Decisões (2026-09-29)

1. **Busca em todas as larguras**, não só no computador: no celular é onde a lista cansa mais de rolar.
2. **A busca atravessa as categorias.** Com texto no campo, a Lista mostra os itens de todas as categorias
   que batem, agrupados por categoria, em vez de só a categoria do chip. Tocar num chip limpa a busca.
3. **Sem acento e sem caixa:** "macacao" acha "Macacão de algodão". Procura no nome e no grupo do item.
4. A busca vive só na tela (não vai para a URL nem para o servidor).

## Requisitos

| ID | Requisito |
|---|---|
| BL-R1 | A Lista tem um campo de busca com rótulo acessível "Buscar item", ícone de lupa e alvo de 44px, logo acima dos chips de categoria. |
| BL-R2 | QUANDO o campo tem texto (ignorando espaços nas pontas), a Lista mostra os itens de qualquer categoria cujo nome ou grupo contém o texto, sem diferenciar acento nem caixa, agrupados por categoria na ordem Roupas, Higiene, Alimentação, Acessórios, cada grupo com o ícone da categoria. |
| BL-R3 | Durante a busca, o título do cartão diz "Resultados para “texto”" e uma região viva anuncia "N itens encontrados" (1 → "1 item encontrado"). Nenhum chip fica marcado. |
| BL-R4 | QUANDO nada bate, a Lista diz "Nenhum item com “texto”." e oferece "limpar busca". |
| BL-R5 | Com texto no campo, aparece um botão "Limpar busca"; Esc dentro do campo também limpa. Tocar num chip de categoria limpa a busca e mostra aquela categoria. |
| BL-R6 | Os itens encontrados funcionam como na lista normal: status, editar, remover, inspiração e reserva de presente. |
| BL-R7 | Acessibilidade e responsividade como no resto do app: AA, foco visível, sem rolagem horizontal em 320–1280px. |

## Critérios de aceite

1. Teste unitário da regra de busca (acento, caixa, grupo, espaços, vazio).
2. E2E: achar item de outra categoria, lista vazia, limpar pelo botão, por Esc e pelo chip; axe sem violações.
3. `lint`, `typecheck`, `test`, build e `test:e2e` verdes.

## Rastreio

| Requisito | Status |
|---|---|
| BL-R1–R7 | concluído (60/60 E2E com axe; 6 testes da regra; sem rolagem lateral em 320, 390, 834 e 1280px) |
