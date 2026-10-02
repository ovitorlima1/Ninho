# Listas de presentes — resumo da E1

**O que entrou**
- **Banco:** `gift_lists`, `gift_list_items`, `gift_pledges` e `pix_accounts` (dinheiro em centavos). O enxoval e o link do Perfil não mudaram.
- **Regras puras, com testes:** `lib/gift-rules.ts` (saldo, item inteiro, trava de meta) e `lib/pix.ts` (chave, BR Code, CRC conferido com o
  exemplo do manual do Banco Central).
- **API da mãe** (`/api/me/lists`, `/api/me/pix`): listas por modelo (chá de fralda, chá de bebê, em branco), itens em reais, em unidades
  ou de uma pessoa, link da loja só `https`, recado, "pode ser parecido", "já tenho", reordenar, "Recebi"/desfazer, Pix de teste de R$ 0,01.
- **API do convidado** (`/api/lists/:token`): lista sem chave Pix, sem nomes e sem valores por pessoa; promessa com o item travado na
  transação (quatro pedidos disputando o mesmo saldo → um entra); link de gerenciamento guardado só como hash; cancelar enquanto prometido.
- **Telas:** aba **Presentes** em Lista (Enxoval · Presentes · Inspirações), minhas listas, detalhe da lista (evento, link, Pix, presentes,
  contribuições) e a página `/lista/:token` com as folhas de valor, Pix (QR + copia e cola), unidades, item inteiro e "suas reservas".
- **Conta:** exportação inclui listas, itens, promessas e Pix (sem os tokens); excluir a conta apaga tudo.
- **Roteador:** a rota logada passou a aceitar endereços de dois níveis (`/gifts/12`).
- Dependência nova no front: `qrcode-generator` 2.0.4 (MIT, sem dependências), para desenhar o QR no navegador.

**Verificação:** lint, typecheck, 40 testes do front e 42 da API (20 novos: Pix e saldo), builds e 90/90 E2E
(6 cenários de API e 4 de tela, no celular e no computador, com axe). Sem rolagem lateral em 320, 390 e 1280px.

**Não verificado:** a leitura do QR Code por um app de banco de verdade. O texto do Pix segue o padrão e o CRC confere com o
exemplo oficial, mas o primeiro Pix de teste (R$ 0,01, na tela da chave) deve ser lido num banco antes de divulgar uma lista.

**Fica para as próximas entregas:** fotos (E2); painel do chá, pausar a lista, link novo e e-mail de aviso (E3); o bloco do Início com o evento.
