# Design — nome e telefone do convidado

## Dados

| Tabela | Mudança | Por quê |
|---|---|---|
| `gift_reservations` | `guest_phone text` (nulo), `show_name boolean not null default true` | Reserva antiga fica sem telefone e com o nome visível, como hoje (CC-R13). |
| `gift_pledges` | `guest_phone text` (nulo) | `show_name` já existe. |

Só se acrescenta: `drizzle-kit push` aplica sem `--force`, e o deploy (`push`) segue como nas features anteriores.

## Regra do telefone

Uma função pura, `normalizeBrPhone(input) → "+55DDNNNNNNNNN" | null`, reaproveitando a regra de `normalizePixKey`
(DDD de dois dígitos sem zero + número de 8 dígitos começando em 2 a 5, ou de 9 começando em 9):

- tira tudo que não é dígito; aceita `+55`/`55` na frente (só quando sobram 12 ou 13 dígitos);
- fixo: `[1-9]\d[2-5]\d{7}`; celular: `[1-9]\d9\d{8}`.

Mora em `lib/db/src/schema/phone.ts` (sem banco), usada pelos esquemas zod. O front tem a própria cópia pequena em
`ninho/src/lib/phone.ts` (normalizar e formatar), com os mesmos casos de teste. O front não importa `@workspace/db`.

## API

- `lib/db/src/schema/giftSharing.ts`: `reserveGiftSchema` ganha `guestName` obrigatório (2–120), `guestPhone` obrigatório
  (transformado em E.164) e `showName` (padrão `true`). `updateGiftReservationSchema` (a mãe corrigindo) não muda.
- `lib/db/src/schema/giftLists.ts`: `createPledgeSchema` ganha `guestName` obrigatório e `guestPhone` obrigatório.
- `routes/gift.ts`:
  - grava `guestPhone` e `showName`;
  - `publicItem` devolve `guestName` só quando `showName` é verdadeiro e **nunca** o telefone (CC-R9, CC-R14);
  - a resposta de erro de validação diz o que falta, sem repetir o valor.
- `routes/lists-public.ts`: grava `guestPhone`; `guestPledge` (o que o convidado vê) não o inclui.
- Mãe: `ownerPledge` e a lista do workspace já espalham a linha inteira, então `guestPhone` chega sozinho; o teste de API
  fixa isso para ninguém tirar sem querer. O PATCH da mãe continua sem aceitar telefone.
- Exportação e exclusão de conta: já usam `select()` da linha toda e `delete` por conta; só ganham teste.
- Log: o handler não registra o corpo; o teste de CC-R10 confere a saída do log numa reserva.

## Front

- `ContactFields` (novo, `components/contact-fields.tsx`): nome + WhatsApp + aviso de privacidade, com validação em
  linha, `autocomplete="name"` / `"tel"`, `inputMode="tel"`; devolve `{ name, phone, valid, errors }`.
  Usado pelos dois formulários, para a validação e o texto serem os mesmos.
- `guest-contact-storage.ts` (`features/gift`): lê e grava `{ name, phone }` em `localStorage` (`ninho:convidado`),
  com `try/catch` e validação ao ler.
- Presentes (`guest-item-modal.tsx`): `nameField` vira `ContactFields` nos passos valor, unidades e inteiro. O botão de
  confirmar valida antes de chamar a API.
- Enxoval (`gift-reservation-modal.tsx`): mesmo `ContactFields`, mais o interruptor "Mostrar meu nome na lista".
  Recebe o nome da mãe para o aviso.
- Página pública do Enxoval: texto "Já escolhido" / "Já presenteado" quando o nome vem nulo.
- Mãe: `list-modals.tsx` (contribuições) e `checklist-panel.tsx` (item reservado) mostram telefone formatado e o atalho
  do WhatsApp; um pequeno `ContactLine` reaproveitado.

## Riscos

- **Conversão:** pedir telefone derruba parte das reservas. Decisão do dono; o aviso explica a finalidade.
- **Dado pessoal de terceiro:** passa a existir telefone de convidado no banco e na exportação. A política de
  privacidade segue pendente (Todo do projeto); o aviso curto cobre a finalidade por enquanto.
- **Reservas simultâneas:** o `unique` do Enxoval e o `FOR UPDATE` de Presentes continuam valendo; a validação roda antes.
