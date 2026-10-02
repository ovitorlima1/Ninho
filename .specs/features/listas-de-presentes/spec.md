# Listas de presentes e chá de bebê

**Tamanho:** Complex (banco, API pública, dinheiro prometido, dado pessoal novo e umas dez telas). Três entregas.
**Origem:** pedidos do dono em 2026-09-22 (chá de fralda, várias listas, links e fotos) e em 2026-10-02
("a pessoa pagar uma parte do valor e mostrar quanto falta"; "se alguém quiser comprar o item todo, deixar marcado";
"foto do produto e link em cada item"). Itens p01–p12 do diagnóstico.
**Desenho:** canvas "Ninho · Telas", etapas 6 a 9 — https://claude.ai/artifact/LC23F4YQ2QhTzVc42TPdHA
**Estado desta spec:** só a especificação. Design técnico e tarefas vêm depois da aprovação.

## Decisões do dono

| Data | Decisão |
|---|---|
| 2026-09-22 | As listas de presentes ficam **dentro de Lista**, numa aba "Presentes" ao lado de "Enxoval". A navegação continua com cinco destinos. |
| 2026-10-02 | **O dinheiro não passa pelo Ninho.** O convidado paga por Pix direto para a mãe; a contribuição entra como prometida e a mãe confirma com "Recebi". |
| 2026-10-02 | **Quem dá o item inteiro escolhe se o nome aparece** para os outros convidados. A mãe sempre vê. |
| 2026-10-02 | **Fotos enviadas ficam na própria VPS** (entram no backup). Trocar para um serviço externo fica como opção futura. |

## Decisões desta spec (assumidas, mudar aqui se o dono discordar)

1. **Listas de presentes são dados novos**, separados do enxoval. O link que hoje compartilha o enxoval (Perfil) continua
   funcionando como está; unificar os dois fica fora desta feature.
2. **Três tipos de meta por item:** em reais (várias pessoas dão valores), em unidades (várias pessoas levam parte da
   quantidade) e uma pessoa (o item é de quem reservar).
3. **Valores em centavos**, inteiros. Item em reais de R$ 1,00 a R$ 99.999,00; contribuição mínima de R$ 1,00.
4. **Prometido conta para "quanto falta".** Assim ninguém contribui em dobro enquanto a mãe não confirma. A mãe pode
   desfazer uma promessa que não caiu, e o valor volta a ficar disponível.
5. **Sem conta para o convidado.** Cada reserva ou contribuição devolve um link particular de gerenciamento, guardado
   no aparelho e mostrado na tela de agradecimento; é com ele que o convidado cancela.
6. **Um link de loja por item** nesta feature (o canvas admite vários; fica para depois).
7. **Limites:** 10 listas por conta, 100 itens por lista.

## Entregas

| Entrega | O que a pessoa passa a conseguir | Requisitos |
|---|---|---|
| **E1 · Chá que funciona** | Criar listas por modelo, itens com meta em reais, em unidades ou de uma pessoa, link da loja, dados do evento e recado; convidado contribui com valor por Pix, leva parte da quantidade ou assume o item inteiro, e cancela pelo próprio link; mãe confirma o que recebeu. | LP-R1 a LP-R32 |
| **E2 · Foto do produto** | Foto enviada pela mãe ou trazida da página da loja, na lista e no item. | LP-R33 a LP-R39 |
| **E3 · Acompanhamento** | Painel do chá, pausar a lista e gerar link novo, aviso por e-mail quando alguém reserva. | LP-R40 a LP-R45 |

## Requisitos

### Listas (mãe)

| ID | Requisito |
|---|---|
| LP-R1 | A aba Lista ganha "Presentes" ao lado de "Enxoval" e "Inspirações". Nela a mãe vê suas listas, cada uma com nome, data do evento (se houver), progresso e estado (aberta ou encerrada). |
| LP-R2 | A mãe cria uma lista a partir de um modelo: **chá de fralda** (fraldas RN, P, M e G em pacotes, lenço umedecido e pomada, em unidades), **chá de bebê** (itens sugeridos em reais e de uma pessoa) ou **em branco**. Os itens do modelo são editáveis e removíveis. |
| LP-R3 | A mãe edita nome da lista, data, hora e local do evento (todos opcionais) e uma mensagem de boas-vindas de até 280 caracteres. |
| LP-R4 | A mãe exclui uma lista com confirmação. SE a lista tem contribuições ou reservas, a confirmação diz quantas serão apagadas. |
| LP-R5 | QUANDO a conta atinge 10 listas ou a lista atinge 100 itens, o app explica o limite em vez de criar. |

### Itens (mãe)

| ID | Requisito |
|---|---|
| LP-R6 | Cada item tem nome, tipo de meta e, conforme o tipo: valor total (em reais), quantidade e unidade ("pacotes", "unidades") ou nada (uma pessoa). Um item de uma pessoa pode ter preço de referência, só informativo. |
| LP-R7 | Cada item pode ter um recado de até 200 caracteres ("de preferência sem perfume") e a marca "pode ser parecido". |
| LP-R8 | Cada item pode ter um link de loja. O app aceita só `https`, mostra sempre o domínio ao lado do link e abre em nova aba com `noopener noreferrer`. |
| LP-R9 | Em item em reais, a mãe escolhe se aceita o presente inteiro (ligado por padrão). |
| LP-R10 | SE um item já tem contribuição ou reserva, a mãe não pode trocar o tipo de meta nem baixar a meta abaixo do que já foi prometido ou recebido; o app explica o porquê. |
| LP-R11 | A mãe reordena os itens e pode marcar um item como "já tenho", que o tira da lista dos convidados sem apagar o histórico. |

### Pix (mãe)

| ID | Requisito |
|---|---|
| LP-R12 | Para ter itens em reais, a mãe informa uma vez a chave Pix, o nome do recebedor (até 25 caracteres) e a cidade (até 15). O app valida o formato da chave (CPF, telefone, e-mail ou aleatória) e mostra um Pix de teste de R$ 0,01 para ela conferir no próprio banco. |
| LP-R13 | A chave Pix nunca aparece na lista pública: só é entregue a quem acabou de registrar uma contribuição, dentro do código Pix. |
| LP-R14 | A chave Pix entra na exportação de dados e é apagada com a conta. |

### Página do convidado

| ID | Requisito |
|---|---|
| LP-R15 | Cada lista tem um link próprio, que não se adivinha. A página mostra o nome da lista, quem é a mãe (nome de exibição), os dados do evento, a mensagem e os itens. Não mostra orçamento, enxoval nem dados do perfil. |
| LP-R16 | Cada item mostra nome, link da loja com o domínio, recado e o estado: **disponível**; **em andamento**, com barra e "R$ X de R$ Y · faltam R$ Z" ou "N de M pacotes · faltam K"; **completo**; ou **presente de alguém**. |
| LP-R17 | A barra de item em reais tem dois tons: recebido (forte) e prometido (claro), com legenda. |
| LP-R18 | A página nunca mostra quem contribuiu nem quanto cada pessoa deu. Só mostra o nome de quem assumiu um item inteiro, e apenas SE essa pessoa permitiu. |

### Contribuir com um valor

| ID | Requisito |
|---|---|
| LP-R19 | Em item em reais com saldo, o convidado escolhe um valor sugerido, digita outro ou escolhe "completar o que falta". O app recusa valor menor que R$ 1,00 ou maior que o que falta, dizendo quanto falta. |
| LP-R20 | O convidado pode informar o nome (opcional, até 120 caracteres). |
| LP-R21 | QUANDO a contribuição é registrada, ela entra como **prometida**, o saldo do item diminui na hora e o convidado vê o QR Code e o "Pix copia e cola" com o valor, o nome do recebedor e um identificador que a mãe reconhece no extrato. |
| LP-R22 | SE duas pessoas tentam fechar o mesmo saldo ao mesmo tempo, só a primeira entra; a segunda é avisada do novo saldo. A soma de prometido e recebido nunca passa da meta. |
| LP-R23 | O convidado escolhe "já fiz o Pix" ou "vou fazer depois"; nos dois casos a contribuição continua prometida até a mãe confirmar. A mãe vê o que o convidado disse. |

### Item inteiro e quantidades

| ID | Requisito |
|---|---|
| LP-R24 | ENQUANTO um item em reais não tem contribuição e aceita presente inteiro, o convidado pode assumi-lo, dizendo se vai **comprar e levar** ou **mandar o valor por Pix**. O item fecha para os outros. |
| LP-R25 | QUANDO um item em reais já tem contribuição, "dar o item inteiro" dá lugar a "completar o que falta". |
| LP-R26 | Ao assumir um item inteiro (em reais ou de uma pessoa), o convidado decide se o nome aparece para os outros convidados; desligado, a lista mostra "já escolhido". |
| LP-R27 | Em item em unidades, o convidado escolhe quantas unidades leva, de 1 até o que falta; vários convidados dividem a meta. |

### Cancelar e confirmar

| ID | Requisito |
|---|---|
| LP-R28 | O convidado cancela a própria reserva ou contribuição pelo link de gerenciamento, ENQUANTO a mãe não confirmou o recebimento. O saldo volta para a lista. |
| LP-R29 | A mãe vê, por item, cada contribuição ou reserva com nome, valor ou quantidade, data, estado e o que o convidado declarou; e o resumo "recebido · prometido · faltam". |
| LP-R30 | A mãe marca "Recebi" (vira confirmada), desfaz uma confirmação feita por engano e desfaz uma promessa que não caiu. |
| LP-R31 | QUANDO recebido chega à meta, o item aparece como completo para todos. |

### Segurança e acessibilidade (todas as entregas)

| ID | Requisito |
|---|---|
| LP-R32 | A página pública limita reservas e contribuições por origem; nomes e recados são tratados como texto; links só `https`; nada de dado do convidado além do nome que ele digitou; AA, alvos de 44px, foco visível e sem rolagem lateral em 320–1280px, como no resto do app. |

### E2 · Foto do produto

| ID | Requisito |
|---|---|
| LP-R33 | A mãe envia uma foto por item (JPEG, PNG ou WebP, até 8 MB). O servidor reduz para no máximo 1200px, regrava a imagem e apaga os metadados, inclusive a localização. |
| LP-R34 | A mãe pode pedir a foto da loja: o servidor lê a página do link, copia a imagem publicada pela loja e aplica o mesmo tratamento. SE a loja bloquear ou não tiver imagem, o app avisa e oferece o envio. |
| LP-R35 | A busca na loja só acessa `https`, recusa endereços internos, limita tempo e tamanho e não segue para outros domínios sem a mesma checagem. |
| LP-R36 | As fotos ficam num volume da VPS, com nome aleatório, e são servidas pelo próprio app. Entram no backup. |
| LP-R37 | A lista do convidado e a tela do item mostram a foto; sem foto, aparece o ícone do item. Toda foto tem texto alternativo com o nome do item. |
| LP-R38 | Trocar ou remover a foto apaga o arquivo antigo; excluir o item, a lista ou a conta apaga as fotos. |
| LP-R39 | Limite de armazenamento por conta, com mensagem clara ao atingir. |

### E3 · Acompanhamento

| ID | Requisito |
|---|---|
| LP-R40 | Painel do chá: dias até o evento, total recebido e prometido, metas por item e "quem vai dar o quê". |
| LP-R41 | O bloco pêssego do Início mostra o próximo evento de lista, quando houver, no lugar do próximo marco. |
| LP-R42 | A mãe pausa a lista: a página continua visível, mas não aceita novas reservas nem contribuições. |
| LP-R43 | A mãe gera um link novo para a lista; o antigo para de funcionar na hora. |
| LP-R44 | QUANDO alguém reserva ou contribui, a mãe recebe um e-mail discreto, sem valores no assunto. Ela pode desligar o aviso. |
| LP-R45 | Excluir a conta apaga listas, itens, contribuições, chave Pix e fotos; a exportação de dados inclui tudo isso. |

## Fora de escopo

- Pagamento dentro do app, confirmação automática de Pix, taxas e estorno.
- Conta para o convidado; lembrete para quem prometeu e não pagou.
- Vários links por item; importar lista de outro site.
- Unificar o link do enxoval (Perfil) com as listas novas.
- Lista em tabela no computador (item r09).

## Critérios de aceite

1. E2E do caminho completo de um chá: criar a lista pelo modelo, cadastrar o Pix, convidado contribui com parte do valor,
   outro completa o que falta, a mãe confirma e o item fica completo.
2. E2E de item inteiro (com e sem nome à mostra), de quantidades divididas, de cancelamento pelo convidado e de duas
   contribuições disputando o mesmo saldo.
3. Teste da regra de saldo (prometido + recebido ≤ meta) e do código Pix gerado, conferido contra o padrão do Banco Central.
4. A página pública não devolve chave Pix, valores por pessoa nem nomes de quem contribuiu (teste que lê a resposta da API).
5. `lint`, `typecheck`, `test`, build e `test:e2e` verdes; axe sem violações sérias; sem rolagem lateral em 320–1280px.

## Pontos para o design técnico

- Modelo de dados das listas, itens e contribuições; trava por item para a disputa de saldo.
- Geração do Pix estático (BR Code) no servidor, sem serviço externo; identificador por contribuição.
- Link de gerenciamento do convidado: token só com hash no banco, como os links de e-mail.
- Onde guardar a chave Pix e como reduzir a exposição (entregar só dentro do código, limitar pedidos).
- E2: biblioteca de imagem, volume e rota de mídia; proteção da busca na loja contra acesso a endereços internos.

## Rastreio

| Requisitos | Entrega | Status |
|---|---|---|
| LP-R1 a LP-R32 | E1 | especificado |
| LP-R33 a LP-R39 | E2 | especificado |
| LP-R40 a LP-R45 | E3 | especificado |
