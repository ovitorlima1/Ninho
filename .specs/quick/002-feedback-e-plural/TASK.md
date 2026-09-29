# 002 — Link de feedback falso e plural nas inspirações

**Pedido (2026-09-29):** itens pré-lançamento "link de feedback" e "texto das inspirações".

**Onde:** `features/profile/profile-panel.tsx`, `styles/components.css`, `features/recommendations/recommendation-link-modal.tsx`.

**O quê:**
1. O botão "deixar feedback do beta" do Perfil apontava para `https://forms.gle/ninho-feedback`, que responde **404**
   (conferido em 2026-09-29). Sai o botão e o CSS `.feedback-link`. Quando houver um formulário real, volta com a URL certa.
2. O diálogo de vincular inspiração dizia "itens de … que já está na sua lista" no plural, e o ternário devolvia
   "na sua lista" nos dois ramos. Passa a "que já está" (um item) / "que já estão" (vários).

**Pronto quando:** lint, typecheck, testes e E2E verdes; nenhum link para `forms.gle` no app.
