# Nome e telefone do convidado — resumo

Construída em 2026-10-14 na branch `contato-do-convidado`. Spec: CC-R1 a CC-R18, todos atendidos.

## O que mudou

- **Convidado:** em Presentes (valor, quantidade e item inteiro) e no Enxoval ("vou presentear"), "Seu nome" e
  "Seu WhatsApp" são obrigatórios. O erro aparece junto do campo, em texto, e o foco vai para o primeiro campo errado. O
  telefone é reformatado ao sair do campo (`(11) 91234-5678`). Embaixo, o aviso: "Seu nome e telefone ficam só com Ana,
  para ela saber quem escolheu e falar com você. Não são usados para mais nada."
- **Nome público no Enxoval:** novo interruptor "Mostrar meu nome na lista" (ligado por padrão). Desligado, a página
  pública mostra "Já escolhido" e o nome nem chega ao navegador.
- **Mãe:** a contribuição (Presentes) e o item reservado (Enxoval) mostram o telefone e "Chamar no WhatsApp"
  (`wa.me`, nova aba). Reserva antiga aparece como "sem telefone".
- **Aparelho:** depois de uma reserva, nome e telefone ficam no `localStorage` e preenchem a próxima. Nada disso vai ao
  servidor por causa disso.

## Como foi feito

- Banco (só acréscimos): `gift_reservations.guest_phone` e `show_name` (padrão `true`), `gift_pledges.guest_phone`.
- Regra: `normalizeBrPhone` em `lib/db/src/schema/guestContact.ts` (celular `9XXXX-XXXX`, fixo `[2-5]XXX-XXXX`, com
  máscara, `+55` ou zero antes do DDD; DDD 55 não é confundido com o país). Guardado em `+55…`. O front tem a cópia
  pequena em `ninho/src/lib/phone.ts`.
- API: os esquemas exigem nome (2 a 120) e telefone; erro 400 com a mensagem e o campo (`field`). `publicItem` e
  `guestPledge` não têm o telefone; `ownerPledge` e o workspace já devolvem a linha inteira, então o telefone chega
  à mãe sem rota nova. Exportação e exclusão de conta já cobriam as duas tabelas.
- Front: `useGuestContact` e `ContactFields` (`components/contact-fields.tsx`), usados pelos dois formulários;
  `GuestPhone` (`components/guest-phone.tsx`) nas telas da mãe.

## Verificação

- `pnpm run typecheck`, `pnpm lint`: verdes. Unitários: 121 (56 no front, 65 na API), 12 novos (telefone nos dois lados,
  esquemas de reserva e de contribuição).
- E2E: 126/126 (63 cenários em celular e computador), 2 novos e 6 ajustados; axe sem violação nos formulários novos.
  Cobrem: 400 sem nome, sem telefone e com telefone inválido (nada gravado); telefone normalizado; nenhuma resposta
  pública (lista, reserva, consulta das reservas) com o telefone; exportação com o telefone; nome escondido no Enxoval;
  aparelho que lembra o contato.
- CC-R10 (telefone fora do log): conferido lendo o código — o log de requisição guarda só id, método e caminho, e nenhuma
  rota registra o corpo. Não há teste automatizado para isso.
- Capturas conferidas em 375 e 1280px (formulários com e sem erro, telas da mãe, página pública).
- Achado na conferência visual e corrigido: com o interruptor ligado e o nome vazio, o texto dizia "já escolhido".

## No deploy

- `drizzle-kit push` aplica sem `--force` (3 colunas novas, nulas ou com padrão). Dados antigos continuam válidos.
- **Não conferido:** o atalho do WhatsApp num celular de verdade; o envio de uma reserva real em produção.
- **Pendente do dono (Todo do projeto):** política de privacidade. Hoje o aviso curto junto dos campos cobre a
  finalidade; passa a existir telefone de terceiro no banco e na exportação.
