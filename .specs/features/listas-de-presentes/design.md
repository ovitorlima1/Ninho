# Design técnico — listas de presentes, entrega E1

Cobre LP-R1 a LP-R32. E2 (fotos) e E3 (acompanhamento) terão design próprio.

## Banco (`lib/db/src/schema/giftLists.ts`)

Tabelas novas, sem tocar em `checklist_items` nem no link do enxoval.

| Tabela | Colunas |
|---|---|
| `gift_lists` | `id`, `user_id`, `name`, `template`, `event_date` (AAAA-MM-DD), `event_time` (HH:MM), `event_place`, `message`, `token` (único, 43 caracteres), datas |
| `gift_list_items` | `id`, `list_id`, `user_id`, `name`, `kind` (`money` \| `units` \| `single`), `goal_cents`, `goal_units`, `unit_label`, `reference_cents`, `note`, `similar_ok`, `store_url`, `allow_whole`, `hidden` ("já tenho"), `sort_order`, datas |
| `gift_pledges` | `id`, `list_id`, `item_id`, `user_id` (dona), `kind` (`money` \| `units` \| `whole`), `amount_cents`, `units`, `whole_mode` (`bring` \| `pix`), `guest_name`, `show_name`, `guest_says_paid`, `status` (`promised` \| `confirmed` \| `cancelled`), `code` (identificador do Pix, único), `manage_token_hash` (único), datas, `confirmed_at` |
| `pix_accounts` | `user_id` (PK), `key`, `key_type`, `recipient_name`, `city`, datas |

Dinheiro sempre em centavos (inteiro).

## Regra de saldo (`api-server/src/lib/gift-rules.ts`, pura, com testes)

`summarizeItem(item, pledges)` devolve `committed`, `confirmed`, `remaining` e `state`:

- **money:** `committed` = soma de `amount_cents` das promessas ativas (`promised` + `confirmed`); um `whole` ativo fecha o item.
  `state`: `whole` (alguém assumiu), `complete` (`remaining` = 0), `progress` (tem promessa), `open`.
- **units:** igual, em unidades.
- **single:** um `whole` ativo → `whole`; senão `open`.

`canPledge(item, summary, request, pixReady)` valida: valor entre R$ 1,00 e o que falta; unidades entre 1 e o que falta;
item inteiro só sem promessa ativa e, em `money`, com `allow_whole`; valor em dinheiro só com Pix cadastrado.

A disputa de saldo é resolvida com `SELECT … FOR UPDATE` na linha do item dentro da transação que insere a promessa.

## Pix (`api-server/src/lib/pix.ts`, puro, com testes)

- `normalizePixKey(text)` → `{ key, type }` para CPF (com dígitos verificadores), CNPJ, telefone (`+55…`), e-mail e chave aleatória (UUID).
- `buildPixPayload({ key, name, city, amountCents, txid })` → "copia e cola" no padrão BR Code (EMV): campos 00, 26 (GUI
  `br.gov.bcb.pix` + chave), 52, 53 (986), 54, 58 (BR), 59, 60, 62-05 (identificador) e 63 (CRC16/CCITT-FALSE).
  Nome (até 25) e cidade (até 15) em maiúsculas sem acento. Sem serviço externo.
- O QR Code é desenhado no navegador a partir desse texto, com `qrcode-generator` (MIT, sem dependências).

A chave só sai do servidor dentro do payload, na resposta de quem acabou de criar uma promessa em dinheiro (ou a consulta
com o link de gerenciamento, enquanto ela está prometida). Nunca na leitura pública da lista.

## API da mãe (`routes/lists.ts`, em `/api/me`, atrás do `requireAuth`)

| Rota | Uso |
|---|---|
| `GET /lists` | listas com resumo (itens, progresso) |
| `POST /lists` `{ template, name? }` | cria com os itens do modelo; limite de 10 |
| `GET /lists/:id` | lista, itens com resumo, promessas e se o Pix está pronto |
| `PATCH /lists/:id` · `DELETE /lists/:id` | dados do evento e mensagem · exclusão em transação |
| `POST /lists/:id/items` · `PATCH …/items/:itemId` · `DELETE …/items/:itemId` | itens; limite de 100; trava de LP-R10 |
| `PUT /lists/:id/items/order` `{ ids }` | reordenar |
| `PATCH /lists/:id/pledges/:pledgeId` `{ status }` | "Recebi", desfazer confirmação, desfazer promessa |
| `GET /pix` · `PUT /pix` · `DELETE /pix` · `GET /pix/test` | conta Pix e o Pix de teste de R$ 0,01 |

## API pública (`routes/lists-public.ts`, em `/api/lists`)

| Rota | Uso |
|---|---|
| `GET /:token` | lista para o convidado: sem chave Pix, sem nomes nem valores por pessoa |
| `POST /:token/pledges` | cria promessa; devolve `manageToken` (uma vez) e, se for em dinheiro, o Pix |
| `POST /:token/pledges/lookup` `{ tokens }` | as promessas do convidado (até 20 tokens) |
| `PATCH /:token/pledges/mine` `{ manageToken, guestSaysPaid }` | "já fiz o Pix" |
| `POST /:token/pledges/cancel` `{ manageToken }` | cancela enquanto `promised` |

Criação e consulta limitadas por origem (`giftReservationLimiter`, 20/h). O token de gerenciamento é guardado só como hash.

## Conta

`GET /me/export` inclui listas, itens, promessas e a conta Pix; `DELETE /me/account` apaga as quatro tabelas.

## Front

- `ListScreen` passa a três abas: **Enxoval** (`/checklist`), **Presentes** (`/gifts`) e **Inspirações**.
- `features/gift-lists/`: `gift-lists-panel` (minhas listas + criar por modelo), `gift-list-detail` (`/gifts/:id`: evento,
  link para copiar, Pix, itens com barra, contribuições), `list-modals` (dados da lista, item, Pix, contribuições).
- `features/gift-lists/public/`: `public-list-page` em `/lista/:token`, com as folhas de item, valor, Pix, unidades,
  item inteiro e "suas reservas" (cancelar). Os tokens de gerenciamento ficam no `localStorage` do aparelho e o link
  particular usa o fragmento (`#p=…`), que não vai para o servidor nem para o log.
- `lib/gift-lists.ts`: dinheiro em centavos (`formatCents`, `parseCentsInput`), valores sugeridos e textos de progresso, com testes.
- `components/pix-code.tsx`: QR + copia e cola. `components/progress.tsx` ganha a barra em dois tons.

## Fora da E1

Fotos (E2); painel do chá, pausar, link novo e e-mail de aviso (E3); bloco do Início com o evento (LP-R41, E3).
