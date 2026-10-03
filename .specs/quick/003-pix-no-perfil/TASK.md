# 003 — Chave Pix também no Perfil

**Pedido (2026-10-03):** "sim, coloca no Perfil também" — o cadastro da chave Pix só aparecia dentro de uma lista de presentes.

**Onde:** `features/gift-lists/pix-card.tsx` (novo), `features/profile/profile-panel.tsx`, `e2e/gift-lists.spec.ts`.

**O quê:** um cartão "Pix para receber presentes" no Perfil, entre a lista para presentes e "Sua conta", que mostra a chave
mascarada (ou convida a cadastrar) e abre o mesmo diálogo da lista (`PixModal`, com o Pix de teste de R$ 0,01). A chave é uma
só por conta, então o que muda no Perfil vale nas listas.

**Pronto quando:** lint, typecheck, testes e E2E verdes; E2E cadastra a chave pelo Perfil e a vê na lista.
