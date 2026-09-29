# Busca na Lista — resumo

- `searchItems` e `normalizeSearch` em `src/lib/items.ts`: nome ou grupo, sem acento nem caixa, agrupado na ordem das categorias (6 testes em `items.test.ts`).
- `ChecklistPanel`: campo "Buscar item" acima dos chips; com texto, o cartão vira "Resultados para “…”" com os itens de todas as categorias, cada grupo com o ícone da categoria; região viva com "N itens encontrados"; vazio com "limpar busca". Esc, o botão ×, e tocar num chip limpam.
- A linha do item virou o componente `ItemRow`, usado na categoria e nos resultados (mesmos `data-testid`).
- E2E: 3 cenários novos em `checklist.spec.ts` (celular e computador).
- Fica para depois: a visão em tabela da Lista no computador (a outra metade do item r08).
