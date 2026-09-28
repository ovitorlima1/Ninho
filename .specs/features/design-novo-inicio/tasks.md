# Tarefas — design novo: base global e tela inicial

| # | Tarefa | Onde | Pronto quando | Req. |
|---|---|---|---|---|
| T1 | Tokens do Ninho Bento com os nomes atuais + tokens novos; Plus Jakarta Sans no `index.html`; `theme-color` | `styles/tokens.css`, `index.html` | typecheck e build verdes; nenhuma cor literal fora de `tokens.css` | DN-R1, DN-R2 |
| T2 | Barra de progresso lisa em todos os usos (sem `--tape-tick*`) | `styles/components.css`, `styles/tokens.css` | nenhuma referência a `tape-tick` no CSS | DN-R3 |
| T3 | Logo nova: `public/ninho-icon.svg`, `favicon.svg`, `logo.svg`; `Brand` com `<img>` e "Ninho" | `public/`, `components/brand.tsx`, `components.css` | marca aparece no cabeçalho, na lateral e no login | DN-R4 |
| T4 | Casca: rodapé flutuante < 600, trilho 600–1023, lateral ≥ 1024 | `layout/app-shell.tsx`, `styles/layout.css` | navegação certa em 390, 834, 1024 e 1280px; testids mantidos | DN-R5 |
| T5 | Regras do Início com teste (`enxovalProgress`, `itemsToBuy`) | `lib/overview.ts`, `lib/overview.test.ts` | `pnpm test` verde | DN-R6 |
| T6 | Início em blocos | `features/overview/overview-panel.tsx`, `styles/components.css` | capturas nas 4 larguras batem com o canvas | DN-R6, DN-R7 |
| T7 | Verificação: lint, typecheck, test, build, E2E com axe; capturas; sem rolagem horizontal | — | tudo verde; capturas anexadas ao SUMMARY | DN-R8, DN-R9 |
| T8 | Documentação e acompanhamento: SUMMARY, STATE, ROADMAP, CONCERNS, replit.md; diagnóstico atualizado; PR | `.specs/`, `replit.md` | PR aberto com CI verde | — |

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 (T2–T4 dependem dos tokens de T1; T6 depende de T5).
