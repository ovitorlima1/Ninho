# STATE — memória do projeto

## Decisões

| Data | Decisão | Motivo |
|---|---|---|
| 2026-09-11 | Toda feature/bug passa pelo fluxo TLC (spec → tasks → execute) com commits atômicos citando o achado (`fix(C3): …`). | Pedido do usuário: planejamento e rastreabilidade. |
| 2026-09-11 | Branch `fase-0-correcoes-urgentes`; setup local commitado à parte (795584d). | Histórico limpo. |
| 2026-09-11 | "Investido" = Σ preço × quantidade só de itens "Comprado", em centavos. "Ganhei" (presente) não é gasto. Substitui a regra antiga do replit.md ("resolvidos contam como gastos"). | Auditoria C3; seed usa preço unitário (Fralda 8 un. × R$12). |
| 2026-09-11 | Catálogo de inspirações renovado por 90 dias (revisado 2026-09-11, vence 2026-12-10) + teste de alerta quando faltar < 14 dias. | Escolha do usuário (C4). |
| 2026-09-11 | Limite do reset de senha usa o limitador em memória existente (3/h por e-mail, 10/h por IP). Limitador persistente fica para a Fase 4. | Fecha o abuso já; persistência exige tabela/infra. |
| 2026-09-12 | Status do item vira controle visível de 3 opções; tocar no item abre a folha de edição. | Escolha do usuário (A3/A4). |
| 2026-09-12 | Passada a data prevista, a semana trava em 40 e o app pergunta se o bebê nasceu (sem campo novo no banco). | Escolha do usuário (M5); modo pós-parto vira feature própria. |
| 2026-09-12 | As 334 linhas comentadas do Workspace saíram já na Fase 1, antes da hora (A11 é da Fase 3). | A cópia dobrava o risco de editar o lugar errado. |
| 2026-09-16 | Identidade do PRD §10: ivory/sage/vinho, Fraunces + Karla, fita métrica. Tokens em `src/styles/tokens.css`; sage nunca é texto pequeno (usar `--color-accent-strong`). | Escolha do usuário. |
| 2026-09-16 | Cinco destinos (Início, Lista, Marcos, Orçamento, Perfil) numa casca única (`AppShell`, `NAV_ITEMS`); Inspirações é uma aba da Lista; "sair" só no Perfil. | Escolha do usuário (M4). |
| 2026-09-16 | O login não usa mais `login-pregnancy.png`: era a captura de um projeto de terceiros ("Pregnancy Tracker Logo", com a marca de outro produto). O arquivo continua em `public/`, sem uso. | Risco de direito de uso e de marca. |

## Bloqueios

- **Foto do login:** se o usuário quiser foto no login, precisa de uma imagem licenciada (banco de imagens ou produção própria). Até lá, o painel usa só a identidade.

## Lições

- Animação de entrada que começa em `opacity: 0` deixa a tela em branco em abas em segundo plano e em capturas; animar só o deslocamento resolve.
- Grid com `1fr` cresce até o conteúdo mínimo (a fila de pílulas com rolagem própria gerou rolagem lateral na página): usar `minmax(0, 1fr)`.
- Script de contraste que sobe na árvore até achar fundo opaco foi suficiente para validar todas as telas; guardado em `scratchpad/audit.js` desta sessão — vale virar teste E2E com axe na Fase 3.

- Enter em formulário não é testável pelo teclado sintético do navegador automatizado: `form.requestSubmit()` confirma a ligação real.
- Devolver o foco guardando o elemento não basta: o React recria o botão de origem enquanto o diálogo está aberto. Guardar também o `data-testid` resolve.

- A classe `timeline-panel` foi parar no painel errado (C2) — mudanças de CSS por escopo de classe precisam de verificação visual na tela alvo.
- Medir no navegador (script que varre `getComputedStyle`) achou coisas que o CSS sozinho escondia: o piso de 12px exigiu 133 trocas, mas nenhuma tela quebrou porque a medição rodou em 320, 375 e 1024px.
- Sub-agentes em arquivos disjuntos (catálogo e API) rodaram em paralelo sem conflito; quem commita é sempre o orquestrador.

## Todos

- [x] Atualizar `replit.md` com a nova regra de "investido" (feito na Fase 0).
- [ ] O catálogo de inspirações vence em 2026-12-10; o teste começa a falhar em 2026-11-26 pedindo revisão.
- [ ] Conta de teste local `qa-ninho@teste.local` pode ser apagada do banco de dev quando não for mais útil.
- [ ] Fases 0, 1 e 2 estão na branch `fase-0-correcoes-urgentes`, sem merge e sem push.
- [ ] Decidir o destino de `public/login-pregnancy.png` (sem uso; provável material de terceiros).
- [ ] Modo escuro: os tokens estão prontos para uma paleta escura, que ficou fora da Fase 2.

## Ideias adiadas

- Mover catálogo de inspirações para o banco/CMS (Fase 3+).

## Preferências

- Idioma: pt-BR em docs, commits e copy.
