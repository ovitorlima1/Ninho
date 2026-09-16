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
| 2026-09-16 | Fase 3 com Vitest, Playwright + axe e ESLint como dependências de desenvolvimento; Playwright fixado em 1.60.0 (Chromium em cache). | Escolha do usuário. |
| 2026-09-16 | Inspirações sem foto: bloco com ícone da categoria. | Escolha do usuário (M7). |
| 2026-09-16 | CI só como arquivo, sem push. | Escolha do usuário. |
| 2026-09-17 | O seed do workspace acontece no cadastro; `GET /api/me/workspace` é só leitura (`ensureUserInitialized`). | M9. |
| 2026-09-16 | Sessões registradas (`auth_sessions`): "sair" encerra só o aparelho; "sair de todos" e a redefinição de senha revogam tudo. Tokens antigos (sem `sid`) deixam de valer no deploy. | Escolha do usuário (M10). |
| 2026-09-16 | Exclusão de conta imediata, com senha e a palavra EXCLUIR, numa transação sobre as 9 tabelas (sem FKs); exportação em JSON sem o token do link. | Escolha do usuário (LGPD). |
| 2026-09-16 | Limites de tentativa no Postgres (`auth_attempts`), chaves = escopo + HMAC; o global setup do E2E zera a tabela. Cabeçalhos por middleware próprio (sem helmet); CSP do front por `<meta>`, só no build. | Fase 4 (A9, M10). |
| 2026-09-16 | `main` protegida por ruleset: só PR, `checks` e `e2e` verdes com a branch em dia, sem force push nem exclusão, sem exceção para admin. | Pedido do usuário (M-3). |
| 2026-09-16 | O login não usa mais `login-pregnancy.png`: era a captura de um projeto de terceiros ("Pregnancy Tracker Logo", com a marca de outro produto). O arquivo continua em `public/`, sem uso. | Risco de direito de uso e de marca. |

## Bloqueios

- **Foto do login:** se o usuário quiser foto no login, precisa de uma imagem licenciada (banco de imagens ou produção própria). Até lá, o painel usa só a identidade.

## Lições

- Testes de caracterização antes de refatorar pagaram na hora: acharam três bugs que a verificação manual tinha deixado passar (a automação do navegador digitava o texto de uma vez, escondendo o problema do campo de preço).
- `form.requestSubmit()` e `pressSequentially` são os jeitos confiáveis de simular envio por Enter e digitação real.
- Rodar o E2E numa `git worktree` com `pnpm install --offline` é rápido e permite validar um commit isolado.
- Limitadores e E2E: desde a Fase 4 os contadores ficam no banco, então o global setup faz `TRUNCATE auth_attempts`; contas de teste continuam com X-Forwarded-For próprio (aceito só via proxy local).
- `redact` do pino não protege erros do Drizzle: os valores da consulta vêm dentro da mensagem e do stack. Olhar a saída real do log antes de confiar na redação.
- Importar `@workspace/db` num teste unitário exige `DATABASE_URL`: regra pura vai em arquivo separado do acesso ao banco.
- Screenshot tirado por um spec temporário no ambiente de E2E é o jeito de conferir telas logadas sem criar dados no banco de dev.

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
- [x] Fases 0–4 na `main` (PR #1); actions em Node 24 (PR #2); CI obrigatório na `main` pelo ruleset `main protegida` (2026-09-16).
- [ ] Deploy da Fase 4: `db push` em produção (2 tabelas novas); todos precisarão entrar de novo; conferir `ALLOWED_ORIGINS` se houver outro domínio.
- [ ] Política de privacidade e termos de uso (texto jurídico) — decisão do dono.
- [ ] Ajustes pequenos vistos na divisão: plural "que já está" no modal de inspiração; iniciais do avatar do perfil diferentes das do topo; "gerar novo link" usa o mesmo handler de criar.
- [ ] Decidir o destino de `public/login-pregnancy.png` (sem uso; provável material de terceiros).
- [ ] Modo escuro: os tokens estão prontos para uma paleta escura, que ficou fora da Fase 2.

## Ideias adiadas

- Mover catálogo de inspirações para o banco/CMS (Fase 3+).

## Preferências

- Idioma: pt-BR em docs, commits e copy.
