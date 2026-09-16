# Tarefas — Fase 2

```
T1 fontes + tokens base ──► T2 casca única (AppShell) ──► T3 CSS por camadas ──► T4 fita + Visão geral ──► T5 contraste e toque ──► T6 validação
```

Tudo passa por `App.tsx` e `index.css`: execução sequencial no contexto principal.

---

### T1 — Fontes e tokens (M8, M11, A10)
- **What:** `<link>` de Fraunces (500, 600) e Karla (400–700) com `preconnect`; remover Inter e o `@import` do CSS; bloco de tokens do `design.md` em `:root` + `@theme inline`; `prefers-reduced-motion` e hovers em `(hover: hover)`.
- **Where:** `artifacts/ninho/index.html`, `src/index.css`.
- **Done when:** F2-R16, F2-R17; fontes carregadas conferidas em `document.fonts`.
- **Commit:** `feat(M8,M11): Fraunces e Karla por link, tokens da nova identidade e movimento reduzido`

### T2 — Casca única e navegação (M4, M3)
- **Depends on:** T1.
- **What:** `NAV_ITEMS` único; `AppShell` com barra inferior (< 900px) e lateral (≥ 900px); renderiza só a rota atual; Lista com abas Itens/Inspirações; `/recommendations` mapeado; `h1` e `document.title` pela rota; "sair" só no Perfil; remover `Phone`, `activePanel`, `MobileUtilityLinks`, `DesktopWorkspace`, `DesktopSideSummary`.
- **Where:** `App.tsx`.
- **Done when:** F2-R10, F2-R11, F2-R13; todas as rotas abrem nas duas larguras.
- **Commit:** `feat(M4): casca única com cinco destinos e os mesmos nomes em todo lugar`

### T3 — CSS por camadas (A10, A1, M3, M6, M12)
- **Depends on:** T2.
- **What:** reescrever `index.css` em `base / components / layout` sobre os tokens; um bloco por componente; tablet com duas colunas; alvos de 44px em toque; sem fonte mono; logo, favicon e overlay do login na paleta nova; script de cobertura de classes.
- **Where:** `src/index.css`, `public/logo.svg`, `public/favicon.svg`.
- **Done when:** F2-R1 a F2-R6, F2-R9, F2-R12; script de cobertura sem classes órfãs.
- **Commit:** `refactor(A10): index.css reescrito sobre tokens, na identidade do PRD`

### T4 — Fita métrica e Visão geral (A5)
- **Depends on:** T3.
- **What:** `Progress` vira a fita métrica (progressbar acessível, tamanhos e tom); nova `OverviewPanel` conforme `design.md` §4; avatar com iniciais do perfil.
- **Where:** `App.tsx`, `src/index.css`.
- **Done when:** F2-R7, F2-R14, F2-R15.
- **Commit:** `feat(A5): Visão geral sem repetição, com semana em destaque e fita métrica`

### T5 — Contraste e alvos de toque (A1, M6)
- **Depends on:** T4.
- **What:** script no navegador que mede contraste de todo texto contra o fundo efetivo e o tamanho de todo controle; corrigir o que falhar.
- **Done when:** F2-R8, F2-R9 com 0 falhas em 375 e 1280px.
- **Commit:** `fix(A1,M6): contraste AA e alvos de toque em todas as telas`

### T6 — Validação e docs
- **What:** os 7 critérios de aceite; gates; SUMMARY, STATE, ROADMAP; atualizar `replit.md` (design system).
- **Commit:** `docs: fecha Fase 2`

## Status

| Tarefa | Status | Commit |
|---|---|---|
| T1 | pendente | |
| T2 | pendente | |
| T3 | pendente | |
| T4 | pendente | |
| T5 | pendente | |
| T6 | pendente | |
