# Nome e telefone de quem escolhe um presente

**Tamanho:** Large (duas tabelas, duas rotas públicas, dois formulários, três telas da mãe, regra de privacidade).
**Origem:** "preciso identificar quem está escolhendo o item da lista … pegar o nome e número de contato, semelhante a
landing pages que capturam dados" (dono, 2026-10-14). Revisa LP-R20 e LP-R32 de `listas-de-presentes`.
**Estado desta spec:** em implementação. As "Decisões desta spec" ficam abertas à revisão do dono.

## Decisões do dono

| Data | Decisão |
|---|---|
| 2026-10-14 | **Nome e telefone são obrigatórios** para o convidado reservar ou contribuir, como numa página de captura. |
| 2026-10-14 | **Vale para o Enxoval e para Presentes**, com a mesma validação e o mesmo aviso. |
| 2026-10-14 | **Aviso curto de privacidade junto dos campos, sem caixa de aceite.** |
| 2026-10-14 | **No Enxoval o convidado escolhe se o nome aparece para os outros** (igual a Presentes). A mãe sempre vê nome e telefone. |

## Decisões desta spec (assumidas, mudar aqui se o dono discordar)

1. **Telefone brasileiro, com DDD.** Aceita com ou sem `+55`, com um zero antes do DDD, com espaços, parênteses e traço.
   Fixo (8 dígitos) e celular (9 dígitos) valem. Número de fora do Brasil fica fora desta entrega.
2. **Guardado normalizado** em formato internacional (`+5511912345678`); a tela mostra `(11) 91234-5678`.
3. **Nome com pelo menos 2 caracteres** (depois de cortar espaços) e no máximo 120. Valor como "a" ou "." é recusado.
4. **Dado antigo continua válido.** Reservas e contribuições feitas antes não têm telefone: a mãe vê "sem telefone" e nada
   quebra. A coluna nova é opcional no banco; a obrigação é da API.
5. **A mãe fala com o convidado pelo WhatsApp**: a tela dela mostra o número e um link "Chamar no WhatsApp" (`wa.me`).
6. **O aparelho lembra nome e telefone** depois da primeira reserva, só para pré-preencher; o convidado pode editar.
   Nada vai para o servidor por causa disso.
7. **Nome público no Enxoval vem ligado por padrão** (é o comportamento de hoje). Reservas antigas continuam mostrando o nome.
8. **A mãe não edita o telefone.** Ela corrige nome e estado da reserva como hoje; o telefone é o que o convidado digitou.
9. **Sem confirmação do número** (SMS ou WhatsApp com código): fora do escopo. A mãe confere ao falar com a pessoa.

## Requisitos

### Captar

| ID | Origem | Requisito |
|---|---|---|
| CC-R1 | LP-R20 | Em **Presentes**, os passos de valor, de quantidade e de item inteiro pedem "Seu nome" e "Seu WhatsApp", ambos obrigatórios. |
| CC-R2 | — | No **Enxoval**, o diálogo "vou presentear" pede os mesmos dois campos, ambos obrigatórios. |
| CC-R3 | — | O nome tem de 2 a 120 caracteres; sem isso o botão de confirmar explica o que falta e nada é gravado. |
| CC-R4 | — | O telefone é validado como número brasileiro com DDD (decisão 1). A tela diz o formato esperado e o erro aparece junto do campo, em texto, não só em cor. |
| CC-R5 | — | O servidor valida de novo e recusa com 400 e mensagem clara: nome ausente ou curto, telefone ausente ou inválido. O cliente nunca é a única barreira. |
| CC-R6 | — | O telefone é guardado em formato internacional normalizado; o nome, sem espaços nas pontas. |
| CC-R7 | — | Os campos usam `autocomplete` de nome e de telefone, teclado numérico no celular e rótulo ligado ao campo. |

### Privacidade

| ID | Origem | Requisito |
|---|---|---|
| CC-R8 | LP-R32 | Junto dos campos aparece: "Seu nome e telefone ficam só com {nome da mãe}, para ela saber quem escolheu e falar com você. Não são usados para mais nada." |
| CC-R9 | LP-R18, LP-R32 | **Nenhuma resposta pública devolve telefone**: nem a lista, nem a reserva recém-feita, nem a consulta "suas reservas". |
| CC-R10 | — | O telefone não aparece em log, nem em mensagem de erro. |
| CC-R11 | LP-R14 | A exportação de dados da mãe inclui o telefone de cada reserva e contribuição. Excluir a conta apaga tudo. |

### Nome visível para os outros convidados

| ID | Origem | Requisito |
|---|---|---|
| CC-R12 | LP-R26 | No diálogo do Enxoval, "Mostrar meu nome na lista" vem ligado; desligado, a página pública mostra "Já escolhido" (ou "Já presenteado") sem o nome. |
| CC-R13 | LP-R26 | Reservas feitas antes desta entrega continuam mostrando o nome, como hoje. |
| CC-R14 | — | A resposta pública do Enxoval só carrega o nome quando a pessoa deixou aparecer; o nome escondido não chega ao navegador. |

### Para a mãe

| ID | Origem | Requisito |
|---|---|---|
| CC-R15 | LP-R29 | Em Presentes, cada contribuição ou reserva mostra nome e telefone formatado, com "Chamar no WhatsApp". |
| CC-R16 | — | No Enxoval, o item reservado mostra nome, telefone e o mesmo atalho; sem telefone (reserva antiga), mostra só o nome. |
| CC-R17 | — | O atalho abre `https://wa.me/55…` em nova aba, com `rel="noopener noreferrer"`. |

### Lembrar no aparelho

| ID | Origem | Requisito |
|---|---|---|
| CC-R18 | — | Depois de uma reserva ou contribuição que deu certo, nome e telefone ficam no aparelho e preenchem os campos da próxima. SE o armazenamento estiver bloqueado, tudo funciona sem lembrar. |

## Aceites

1. **Presentes:** convidado tenta contribuir sem telefone → vê o erro junto do campo e nada é gravado; digita `(11) 91234-5678` → o Pix aparece, e a mãe vê nome e telefone na contribuição.
2. **Enxoval:** convidado reserva com nome e telefone e desliga "Mostrar meu nome" → a página pública mostra "Já escolhido", e a resposta da API não contém nome nem telefone; a mãe vê os dois no item.
3. **API:** `POST` sem telefone, com telefone inválido ou com nome de 1 letra → 400; com telefone válido → 201 e o telefone guardado como `+55…`.
4. **Privacidade:** nenhuma das respostas públicas (`GET` da lista, `POST` de reserva, `lookup`) contém o telefone; a exportação contém.
5. **Antigo:** reserva sem telefone continua aparecendo para a mãe e para o público como antes.
6. **Dois aparelhos:** segunda reserva no mesmo aparelho já vem com nome e telefone preenchidos.

## Fora do escopo

Confirmar o número por código; telefone internacional; a mãe editar o telefone; enviar mensagens pelo Ninho; mostrar
o telefone a outros convidados; lista de convidados; e-mail do convidado.
