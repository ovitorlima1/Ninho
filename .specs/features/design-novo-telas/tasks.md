# Tarefas — design novo nas outras telas

| # | Tarefa | Onde | Pronto quando | Req. |
|---|---|---|---|---|
| T1 | Ícone de categoria com cor (`CategoryIcon` + classes `cat-*`) | `components/category-icon.tsx`, `components.css` | usado na Lista e no Orçamento | DT-R2, DT-R4 |
| T2 | Acesso: caixa normal e sem enfeite de barra | `features/auth/*` | capturas 390/1280 | DT-R1 |
| T3 | Lista: progresso, filtros com ícone, selo Essencial, "seu progresso" | `features/checklist/checklist-panel.tsx`, `components.css` | capturas; E2E da lista verde | DT-R2 |
| T4 | Marcos: bloco do próximo marco | `features/timeline/timeline-panel.tsx`, `components.css` | capturas; E2E de marcos verde | DT-R3 |
| T5 | Orçamento: bloco menta, ícones, aviso de categoria estourada (regra pura com teste) | `features/budget/budget-panel.tsx`, `lib/budget.ts`, `components.css` | teste do aviso; E2E do orçamento verde | DT-R4 |
| T6 | Perfil: iniciais, caixa normal, bloco pêssego, "Sua conta" | `features/profile/*`, `components.css` | capturas; E2E de conta verde | DT-R5 |
| T7 | Diálogos, onboarding e estados | `features/*/…modal*`, `features/onboarding/*`, `components/states.tsx` | nenhum texto em caixa alta no JSX | DT-R6 |
| T8 | Verificação completa e documentação; diagnóstico; PR | — | tudo verde; PR aberto | DT-R7 |
