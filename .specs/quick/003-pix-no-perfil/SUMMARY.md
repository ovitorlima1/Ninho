# 003 — resumo

- `PixCard` (features/gift-lists/pix-card.tsx) no Perfil, entre a lista para presentes e "Sua conta": mostra a chave mascarada ou
  convida a cadastrar, e abre o mesmo `PixModal` da lista (com o Pix de teste).
- Mesma chave e mesmo cache (`["pix-account", userId]`) da lista; ao salvar, as listas são revalidadas.
- E2E novo: cadastra a chave pelo Perfil e confere que a lista já mostra a chave, sem o aviso amarelo.
- Verificação: lint, typecheck, 40 testes do front, build e 92/92 E2E.
