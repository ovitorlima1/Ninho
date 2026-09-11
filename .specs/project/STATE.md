# STATE — memória do projeto

## Decisões

| Data | Decisão | Motivo |
|---|---|---|
| 2026-09-11 | Toda feature/bug passa pelo fluxo TLC (spec → tasks → execute) com commits atômicos citando o achado (`fix(C3): …`). | Pedido do usuário: planejamento e rastreabilidade. |
| 2026-09-11 | Branch `fase-0-correcoes-urgentes`; setup local commitado à parte (795584d). | Histórico limpo. |
| 2026-09-11 | "Investido" = Σ preço × quantidade só de itens "Comprado", em centavos. "Ganhei" (presente) não é gasto. Substitui a regra antiga do replit.md ("resolvidos contam como gastos"). | Auditoria C3; seed usa preço unitário (Fralda 8 un. × R$12). |
| 2026-09-11 | Catálogo de inspirações renovado por 90 dias (revisado 2026-09-11, vence 2026-12-10) + teste de alerta quando faltar < 14 dias. | Escolha do usuário (C4). |
| 2026-09-11 | Limite do reset de senha usa o limitador em memória existente (3/h por e-mail, 10/h por IP). Limitador persistente fica para a Fase 4. | Fecha o abuso já; persistência exige tabela/infra. |

## Bloqueios

_nenhum_

## Lições

- A classe `timeline-panel` foi parar no painel errado (C2) — mudanças de CSS por escopo de classe precisam de verificação visual na tela alvo.
- Medir no navegador (script que varre `getComputedStyle`) achou coisas que o CSS sozinho escondia: o piso de 12px exigiu 133 trocas, mas nenhuma tela quebrou porque a medição rodou em 320, 375 e 1024px.
- Sub-agentes em arquivos disjuntos (catálogo e API) rodaram em paralelo sem conflito; quem commita é sempre o orquestrador.

## Todos

- [x] Atualizar `replit.md` com a nova regra de "investido" (feito na Fase 0).
- [ ] O catálogo de inspirações vence em 2026-12-10; o teste começa a falhar em 2026-11-26 pedindo revisão.
- [ ] Conta de teste local `qa-ninho@teste.local` pode ser apagada do banco de dev quando não for mais útil.

## Ideias adiadas

- Mover catálogo de inspirações para o banco/CMS (Fase 3+).

## Preferências

- Idioma: pt-BR em docs, commits e copy.
