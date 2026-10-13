# Sugestões às claras, categorias livres e várias listas no Enxoval

**Tamanho:** Large (banco, API, cinco telas que dependem de categoria e migração de contas que já existem em produção).
**Origem:** pedido do dono em 2026-10-13, sobre a tela Lista: "deixar claro que as opções que já vêm na lista são um
template ou sugestões" e "ter a possibilidade de forma fácil criar uma nova lista e também categorias".
**Estado desta spec:** em construção na branch `listas-e-categorias`.

## Decisões do dono (2026-10-13)

| Decisão | O que muda | O que fica |
|---|---|---|
| **Nova lista = outras listas como o Enxoval.** | A aba Enxoval passa a ter várias listas (Mala da maternidade, Quarto do bebê…), cada uma com seus itens, categorias e status a comprar/comprei/ganhei, e um botão "nova lista" à vista. | O enxoval atual vira a primeira lista, com tudo o que já está nele. A aba Presentes não muda. |
| **Sugestões: aviso + etiqueta em cada item.** | Um aviso no topo, que dá para fechar, e a etiqueta "Sugestão" em cada item que veio pronto; ela some quando a mãe edita ou marca o item. | A conta nova continua começando com os 10 itens. |
| **Categorias: criar, renomear e excluir todas.** | Botão "+ categoria" ao lado das atuais; renomear e excluir qualquer uma, inclusive as 4 que já vêm (excluir pergunta para onde vão os itens). Cada categoria tem uma linha no Orçamento. | As 4 atuais continuam como ponto de partida. |

## Decisões desta spec (assumidas, mudar aqui se o dono discordar)

1. **A aba continua "Enxoval".** A lista que já existe passa a se chamar "Enxoval do bebê" (dá para renomear).
2. **Modelos de lista nova:** Enxoval do bebê (os 10 itens de hoje), Mala da maternidade, Quarto do bebê e Em branco.
   Os itens dos dois modelos novos entram **sem preço**: não inventamos valor de berço nem de camisola.
3. **Limites:** 10 listas por conta, 12 categorias por lista; nome de lista até 60 caracteres e de categoria até 30.
4. **Sempre sobra uma:** a conta tem pelo menos uma lista e a lista pelo menos uma categoria. A última não pode ser
   excluída, só renomeada.
5. **Cor da categoria é automática** (rodízio de malva, menta, pêssego e manteiga); a mãe escolhe o **ícone** entre oito.
6. **Orçamento soma todas as listas.** Com mais de uma lista, as linhas aparecem agrupadas por lista.
7. **Início soma todas as listas** no progresso e em "Para comprar agora". O cartão "Por categoria" vira "Por lista"
   quando há mais de uma.
8. **O link público do Perfil mostra só a primeira lista** (o enxoval). Mala da maternidade tem documento e camisola;
   não é lista de presente.
9. **Inspiração salva entra na primeira lista**, na categoria de mesmo nome; se a mãe renomeou ou apagou essa
   categoria, ela é recriada.
10. **Etiqueta em contas antigas:** vira "Sugestão" o item que continua igual ao que veio (mesmo nome, quantidade e
    preço) e ainda está "A comprar". O que a mãe já mexeu é dela.
11. **Fora desta feature:** mover item de uma lista para outra, reordenar listas e categorias, escolher a cor da
    categoria, compartilhar outra lista que não a primeira.

## Entregas

| Entrega | O que a pessoa passa a conseguir | Requisitos |
|---|---|---|
| **E1 · Sugestões às claras** | Ver que os itens prontos são um ponto de partida e quais ainda não foram tocados. | LC-R1 a LC-R6 |
| **E2 · Categorias livres** | Criar, renomear e excluir categorias, com reflexo no Orçamento. | LC-R7 a LC-R15 |
| **E3 · Várias listas** | Criar listas por modelo, alternar entre elas, renomear e excluir. | LC-R16 a LC-R25 |
| Base | Contas que já existem continuam com tudo; dados protegidos. | LC-R26 a LC-R30 |

## Requisitos

### E1 · Sugestões

| ID | Requisito |
|---|---|
| LC-R1 | ENQUANTO a lista aberta tem item-sugestão e o aviso não foi fechado, a tela mostra no topo: "Começamos com sugestões do Ninho. Apague, edite e acrescente à vontade. Quantidades e preços são estimativas." com o botão "entendi". |
| LC-R2 | QUANDO a mãe toca em "entendi", o aviso some daquela lista e não volta, em nenhum aparelho. |
| LC-R3 | Todo item-sugestão mostra a etiqueta "Sugestão" na linha, inclusive nos resultados da busca. |
| LC-R4 | QUANDO a mãe muda nome, quantidade, preço, categoria ou status de um item, ele deixa de ser sugestão e a etiqueta não volta. |
| LC-R5 | Item que a mãe adiciona (à mão, por inspiração ou pelo "Desfazer" de uma remoção) nunca é sugestão. |
| LC-R6 | QUANDO não resta item-sugestão na lista, o aviso some sozinho. |

### E2 · Categorias

| ID | Requisito |
|---|---|
| LC-R7 | A fila de categorias termina com "+ categoria". O diálogo pede o nome (obrigatório) e o ícone; ao criar, a categoria fica selecionada, vazia, com o convite para adicionar o primeiro item. |
| LC-R8 | SE já existe na lista uma categoria com o mesmo nome (sem contar acento nem maiúscula), o app recusa e diz "Já existe uma categoria com esse nome nesta lista." |
| LC-R9 | O cabeçalho do cartão da categoria tem "editar categoria": renomear e trocar o ícone. |
| LC-R10 | Excluir categoria vazia pede só a confirmação. SE a categoria tem itens, o diálogo diz quantos e a mãe escolhe: mover para outra categoria da mesma lista ou apagar os itens junto. Nada some sem essa escolha. |
| LC-R11 | SE a categoria é a única da lista, o app não exclui e explica que dá para renomear. |
| LC-R12 | QUANDO a lista chega a 12 categorias, o app explica o limite em vez de criar. |
| LC-R13 | O Orçamento tem uma linha por categoria. Categoria nova entra com R$ 0,00 planejado; renomear muda o nome da linha; excluir tira a linha; mover itens leva o gasto deles para a categoria de destino. |
| LC-R14 | Ao adicionar ou editar um item, as opções de categoria são as da lista do item. |
| LC-R15 | Início, busca, link público e exportação mostram sempre o nome atual da categoria. |

### E3 · Listas

| ID | Requisito |
|---|---|
| LC-R16 | O topo da aba Enxoval mostra as listas da conta e o botão "nova lista". |
| LC-R17 | A mãe cria uma lista por modelo (Enxoval do bebê, Mala da maternidade, Quarto do bebê, Em branco), com nome editável. A lista nova abre na hora. Os itens do modelo entram como sugestão (LC-R1, LC-R3). |
| LC-R18 | Trocar de lista troca itens, categorias, progresso e busca; a busca vale só para a lista aberta. O aparelho lembra a última lista aberta. |
| LC-R19 | A mãe renomeia a lista. |
| LC-R20 | Excluir lista pede confirmação que diz quantos itens serão apagados. SE é a única lista, o app não exclui e explica. |
| LC-R21 | QUANDO a conta chega a 10 listas, o app explica o limite em vez de criar. |
| LC-R22 | Com mais de uma lista, o Orçamento agrupa as linhas por lista; "investido" e "planejado" somam todas. |
| LC-R23 | O Início soma todas as listas; com mais de uma, o cartão de progresso é "Por lista". |
| LC-R24 | O link público do Perfil mostra só os itens da primeira lista, e o cartão do Perfil diz o nome dela. |
| LC-R25 | Inspiração salva entra na primeira lista, na categoria de mesmo nome, recriada se não existir. |

### Base

| ID | Requisito |
|---|---|
| LC-R26 | Conta que já existe não perde nada: os itens vão para a lista "Enxoval do bebê", com as categorias e os valores planejados de hoje. Isso acontece sozinho quando a versão nova sobe, antes de atender qualquer pedido. |
| LC-R27 | Toda rota confere que lista, categoria e item são da conta; o que é de outra conta responde como inexistente (404). |
| LC-R28 | A exportação de dados inclui listas e categorias; a exclusão da conta apaga tudo. |
| LC-R29 | As telas novas não têm violação séria no axe, têm alvos de 44px e funcionam em 375, 834, 1024 e 1280px. |
| LC-R30 | A mudança de banco só acrescenta (tabelas e colunas novas): o `migrate` da VPS aplica sem pedir para apagar nada. |

## Modelos de lista

| Modelo | Categorias e itens |
|---|---|
| **Enxoval do bebê** | Os 10 itens de hoje em Roupas, Higiene, Alimentação e Acessórios, com os preços e o planejado atuais. |
| **Mala da maternidade** | **Para a mãe:** camisola ou pijama com abertura (3), sutiã de amamentação (2), absorvente pós-parto (2), chinelo (1), itens de higiene pessoal (1). **Para o bebê:** saída de maternidade (1), body e macacão RN (4), fralda RN (1), manta (2), meias e luvas (3). **Documentos:** documento com foto, cartão do pré-natal e exames, carteirinha do plano ou cartão do SUS. |
| **Quarto do bebê** | **Móveis:** berço, colchão do berço, cômoda com trocador, poltrona de amamentação. **Roupa de cama:** lençol com elástico (3), protetor de colchão impermeável (2), manta (2). **Organização:** cestos organizadores (3), lixeira com tampa (1), luminária de luz suave (1). |
| **Em branco** | Uma categoria "Geral", sem itens. |

## Como conferir (aceite)

1. Conta nova: a Lista abre com o aviso e dez etiquetas "Sugestão". Marcar um item como "comprei" tira a etiqueta
   dele; "entendi" tira o aviso; recarregar a página mantém os dois.
2. "+ categoria" → "Passeio" → item novo nela → o Orçamento ganha a linha Passeio. Renomear para "Passeios" muda nos
   dois lugares. Excluir movendo para Acessórios leva o item junto.
3. "nova lista" → Mala da maternidade → a lista abre com três categorias e itens com etiqueta. Voltar para o Enxoval
   do bebê mostra os itens de antes. Excluir a Mala avisa quantos itens somem; a última lista não deixa excluir.
4. Conta criada antes desta versão: entra e encontra os mesmos itens, o mesmo orçamento e o link público funcionando.
