# Paleta lilás e foto no login

**Tamanho:** Medium (tokens + login; sem mudança de estrutura).
**Origem:** pedido do dono em 2026-09-17 — "eu gostava da paleta do outro" e da foto do login.
**Revê:** a decisão de identidade da Fase 2 (ivory/sage/vinho, Fraunces + Karla).

## Decisões (2026-09-17)

1. **Volta a identidade de antes da Fase 2:** lilás/roxo, fundos lavanda, Montserrat no texto e
   Space Mono nas etiquetas. Toda a estrutura das Fases 2–4 continua (tokens, casca, telas,
   acessibilidade); muda só o que está em `styles/tokens.css`, a fonte carregada e o painel do login.
2. **Foto do Pexels** — "A pregnant woman sits on a bed and smiles", de
   [Jonathan Borba](https://www.pexels.com/@jonathanborba/)
   ([foto](https://www.pexels.com/photo/a-pregnant-woman-sits-on-a-bed-and-smiles-28111779/)),
   [Licença Pexels](https://www.pexels.com/license/) (uso comercial livre, sem crédito obrigatório).
   A primeira escolha (Unsplash, Breno Dias, mulher rindo ao ar livre) foi trocada em 2026-09-18:
   o dono não gostou; a nova é mais próxima da antiga (jovem, em casa, olhando para a barriga).
3. **A foto antiga não volta.** `login-pregnancy.png` era a captura do card "Pregnancy Tracker
   Logo" (Nixtio, Dribbble); a foto da mulher é de banco pago ("Happy expectation. Cheerful
   pregnant millennial woman…" — Shutterstock 1971086771, Adobe Stock 432839213, Alamy, Envato
   Elements; achado por busca reversa no TinEye). O dono escolheu a foto gratuita; o arquivo
   antigo sai do repositório.

## Requisitos

| ID | Requisito |
|---|---|
| LF-R1 | `tokens.css` usa a paleta lilás: fundo lavanda claro, superfícies brancas, ação em roxo, destaques e progresso no lilás vivo antigo (`#a453d1`), sucesso em verde e erro em rosa (tons antigos). |
| LF-R2 | Todo texto continua com contraste AA (4,5:1; 3:1 para bordas de campo): o roxo de texto e o degradê do botão principal são mais escuros que os antigos (`#a453d1` dá 4,06:1 no fundo; o degradê antigo `#bd70ed` dá 3,1:1 com texto branco). |
| LF-R3 | Montserrat no corpo e nos títulos (com espaçamento negativo nos títulos, como antes) e Space Mono nas etiquetas em caixa alta; só os pesos usados são carregados. |
| LF-R4 | Login no computador: painel esquerdo com a foto coberta por um véu roxo em degradê, marca, etiqueta, título "Prepare a chegada **com leveza.**" e texto de apoio legíveis sobre a foto. No celular: faixa com a foto e o mesmo véu, marca e frase. |
| LF-R5 | A foto é decorativa (`alt=""`), servida de `public/images/` (≤ 300 kB; a atual tem 214 kB), carregada só nas telas de acesso e sem quebrar a CSP (`img-src 'self'`). |
| LF-R6 | `public/login-pregnancy.png` sai do repositório. |
| LF-R7 | E2E e axe continuam verdes (sem violações sérias/críticas nas telas cobertas, 375 e 1280 px). |

## Fora de escopo

- Voltar o logo antigo (o símbolo atual fica, nas cores novas).
- Modo escuro.

## Critérios de aceite

1. Capturas do login (celular e computador), Início, Lista e Perfil mostram a paleta lilás.
2. `pnpm lint`, `typecheck`, `test`, build e `test:e2e` verdes.
3. Nenhuma cor literal fora de `tokens.css` (regra da Fase 2 continua).

## Rastreio

| Requisito | Status |
|---|---|
| LF-R1–R3 | concluído |
| LF-R4–R6 | concluído |
| LF-R7 | concluído (54/54; ver SUMMARY.md) |
