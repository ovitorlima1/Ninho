# Ninho

## Visão

App web mobile-first para gestantes organizarem o enxoval do bebê com calma: checklist
personalizado, progresso visual acolhedor, marcos semanais da gestação, orçamento e lista
de presentes compartilhável com a família.

## Para quem

Gestantes (em geral no 2º e 3º trimestre) montando o enxoval, usando principalmente o
celular. Tom de voz acolhedor, sem pressão ("um passo de cada vez, sem pressa, sem excesso").

## Objetivos

1. **Ler e operar sem esforço no celular** — tipografia legível, alvos de toque adequados,
   acessibilidade WCAG 2.2 AA.
2. **Números confiáveis** — progresso, semana gestacional e orçamento sempre corretos.
3. **Base que aguenta evoluir** — código modular, testes e CI antes de crescer em features.
4. **Privacidade** — dados de gestação são dado sensível (LGPD).

## Fora de escopo (por enquanto)

- Comparador de preços entre lojas
- App nativo
- Gamificação (badges, streaks) — ver roadmap anterior em `attached_assets/`

## Referências

- Auditoria "Raio-X do Ninho" (2026-09-11): https://claude.ai/code/artifact/b163a5fb-b6b1-4573-9625-1c7dd3b23778
  — achados com códigos C1–C5, A1–A12, M1–M14, B1–B4 usados como rastreio nas features.
- `replit.md` — stack, decisões de arquitetura e gotchas.
- `.specs/codebase/` — mapeamento do código existente.
