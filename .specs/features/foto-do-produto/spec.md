# Foto do produto nos presentes e nos itens do Enxoval

**Tamanho:** Large (envio de arquivo, tratamento de imagem, armazenamento na VPS, cinco telas e mudança no deploy).
**Origem:** "não tem a opção de incluir a foto do produto" (dono, 2026-10-13). É a entrega E2 de
`listas-de-presentes` (LP-R33 a LP-R39), agora estendida aos itens do Enxoval.
**Estado desta spec:** construída em 2026-10-13 na branch `foto-do-produto` (122/122 E2E; envio conferido no conjunto de
produção rodando no computador). Falta o PR e o deploy.

## Decisões do dono

| Data | Decisão |
|---|---|
| 2026-10-02 | As fotos ficam na própria VPS e entram no backup. |
| 2026-10-13 | **Foto nos presentes e também nos itens do Enxoval** (Enxoval do bebê, Mala da maternidade…). |
| 2026-10-13 | **Nesta entrega a foto é enviada do aparelho.** "Usar a foto da página da loja" (LP-R34 e LP-R35) continua especificado e vira a entrega seguinte. |

## Decisões desta spec (assumidas, mudar aqui se o dono discordar)

1. **Uma foto por item.** Várias fotos, recorte e ampliar em tela cheia ficam fora.
2. **A foto é regravada em WebP**, com no máximo 1200px no maior lado. É o que o navegador de qualquer celular atual abre.
3. **Limite de 100 MB de fotos por conta** (cada foto tratada tem em média menos de 300 KB) e 30 envios por hora.
4. **Quem tem o endereço da foto vê a foto.** O nome do arquivo é aleatório e não se adivinha; é o que permite ao
   convidado ver sem conta. Não é lugar para foto pessoal: o campo se chama "Foto do produto".
5. **Fotos de itens apagados somem em até uma hora**, numa limpeza periódica. É isso que permite o "Desfazer" da
   remoção devolver o item com a foto. Excluir a conta apaga tudo na hora.
6. **No Enxoval, item sem foto fica como hoje** (sem quadrado vazio na linha). Nos presentes, sem foto aparece o ícone.

## Requisitos

### Enviar e tratar

| ID | Origem | Requisito |
|---|---|---|
| FP-R1 | LP-R33 | No diálogo de presente e no de item do Enxoval, a mãe escolhe uma foto do aparelho (galeria ou câmera): JPEG, PNG ou WebP, até 8 MB. |
| FP-R2 | LP-R33 | O servidor confere que o arquivo é mesmo uma imagem, endireita pela orientação da câmera, reduz para caber em 1200×1200, regrava em WebP e não guarda nenhum metadado (localização, aparelho, data). |
| FP-R3 | — | Arquivo de outro tipo, acima de 8 MB ou que não abre como imagem é recusado com mensagem clara: no aparelho quando ele já sabe (tipo e tamanho) e no servidor sempre. |
| FP-R4 | — | A prévia aparece assim que a foto é escolhida; ela só é gravada quando a mãe salva o item. Ao criar um item já com foto, o item é salvo e a foto enviada em seguida. SE o envio falhar, o item fica salvo e o app diz que a foto não foi. |
| FP-R5 | LP-R38 | Na edição, a mãe troca ou remove a foto. |

### Onde aparece

| ID | Origem | Requisito |
|---|---|---|
| FP-R6 | LP-R37 | Presentes: miniatura na lista da mãe; na página do convidado, a foto no cartão do presente e maior no diálogo. Sem foto, o ícone de presente. |
| FP-R7 | — | Enxoval: miniatura na linha do item (na categoria e nos resultados da busca) e na página pública do Perfil. Sem foto, a linha fica como hoje. |
| FP-R8 | LP-R37 | Toda foto tem texto alternativo "Foto de {nome do item}". |
| FP-R9 | — | As fotos carregam sob demanda e com o espaço reservado: a lista não pula quando elas chegam. |

### Guardar e apagar

| ID | Origem | Requisito |
|---|---|---|
| FP-R10 | LP-R36 | As fotos ficam num volume da VPS, com nome aleatório, servidas pelo próprio app. O navegador guarda em cache: quando a foto muda, o nome muda. |
| FP-R11 | LP-R36 | Uma cópia diária das fotos fica junto do backup do banco, por 7 dias. |
| FP-R12 | LP-R38 | Trocar ou remover a foto apaga o arquivo antigo na hora. |
| FP-R13 | LP-R38 | Excluir item, categoria ou lista apaga as fotos em até uma hora. O "Desfazer" da remoção de um item do Enxoval devolve o item com a foto. |
| FP-R14 | LP-R38 | Excluir a conta apaga todas as fotos na hora. |
| FP-R15 | LP-R39 | Ao atingir 100 MB de fotos, o app explica o limite em vez de enviar. |
| FP-R16 | — | A exportação de dados lista as fotos, com o endereço de cada uma. |

### Segurança e acabamento

| ID | Origem | Requisito |
|---|---|---|
| FP-R17 | — | Só a dona envia ou remove a foto de um item seu; item de outra conta responde como inexistente (404). |
| FP-R18 | — | A rota das fotos só aceita o nome aleatório no formato esperado; nenhum caminho vem de quem pede. |
| FP-R19 | — | O envio aceita só corpo de imagem (um formulário de outro site não consegue montá-lo), mantém a checagem de origem e é limitado a 30 por hora por conta. |
| FP-R20 | — | Telas e diálogos sem violação séria no axe, alvos de 44px, sem rolagem lateral em 375, 834, 1024 e 1280px. |
| FP-R21 | — | A mudança de banco só acrescenta, e o deploy continua sendo `git pull` + `up -d --build`. |

## Como conferir (aceite)

1. Enxoval: "adicionar item" com uma foto → a linha mostra a miniatura; recarregar mantém. Editar e trocar a foto muda
   a imagem e o endereço antigo deixa de responder. Remover tira a miniatura.
2. Remover um item com foto e tocar em "Desfazer" devolve o item com a foto.
3. Presentes: presente com foto aparece com miniatura para a mãe e com foto para o convidado, sem conta.
4. Um PDF renomeado para .jpg, ou uma foto de 9 MB, é recusado com mensagem; a lista não muda.
5. Uma foto tirada no celular com localização sai do servidor sem localização.
6. Excluir a conta faz as fotos deixarem de responder.

## Fora desta entrega

Usar a foto da página da loja (LP-R34, LP-R35), várias fotos por item, recorte, ampliar em tela cheia, foto de capa da
lista e mandar a cópia das fotos para fora da VPS.
