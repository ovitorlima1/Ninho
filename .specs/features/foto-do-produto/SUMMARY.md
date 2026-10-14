# Foto do produto — resumo

Na main pelo PR #15 e no ar desde 2026-10-13. Spec: FP-R1 a FP-R21, todos atendidos.

## O que mudou para a mãe e para o convidado

- **Campo "Foto do produto"** nos diálogos de item do Enxoval e de presente: escolher, trocar e remover, com prévia na
  hora. JPEG, PNG ou WebP, até 8 MB. A foto só é gravada quando o item é salvo.
- **Onde aparece:** miniatura na linha do item do Enxoval (inclusive na busca) e na lista de presentes da mãe; na página
  do convidado, no lugar do ícone e maior no diálogo do presente; na página pública do Perfil.
- **Privacidade:** o servidor regrava a foto em WebP de até 1200px e não guarda localização, aparelho nem data.
- **Desfazer:** remover um item do Enxoval e desfazer devolve o item com a foto.

## Como foi feito

- Banco: `media_files` e `photo_key` em `gift_list_items` e `checklist_items`. Só acréscimos.
- API: `lib/photo.ts` (sharp), `lib/media-store.ts` (pasta `MEDIA_DIR`, limpeza de hora em hora), `lib/photo-upload.ts`
  (corpo = a imagem, limite por hora e por conta), `routes/media.ts` (pública, cache longo).
- Front: `components/photo-field.tsx`, `components/item-photo.tsx`, `lib/photos.ts`.
- Deploy: a imagem da API leva o sharp por `pnpm deploy`; volume `media`; serviço `mediabackups`; Nginx aceita 9 MB só
  nas duas rotas de foto.

## Verificação

- `pnpm run typecheck`, `pnpm lint`: verdes. Unitários: 109 (52 no front, 57 na API), com 7 novos de imagem e 4 de
  regras no front.
- E2E: 122/122 (61 cenários em celular e computador), 6 novos em `photos.spec.ts`, axe sem violação séria.
- Imagem `api` construída para linux/amd64 e testada com `docker run`: o sharp carrega, grava num volume novo como
  usuário `node` e o resto do container segue somente leitura.
- Conjunto de produção rodando no computador (`compose.local.yml`): foto de 4,1 MB com GPS enviada pelo Nginx virou
  WebP de 1200×900 sem metadados; 10 MB é recusado; outras rotas continuam em 64 KB; trocar e remover apagam o arquivo;
  a cópia diária gera o `.tar.gz`.
- Capturas conferidas em 375, 834 e 1280px.

## Deploy (2026-10-13)

- Backup do banco logo antes (`ninho-20261013-201816.sql.gz`, no volume `ninho_pgbackups`).
- Mesmo `git pull` + `up -d --build`. O `migrate` aplicou o schema e terminou com "Exited (0)". Subiram o volume
  `ninho_media` e o serviço `mediabackups`, que já gravou a primeira cópia (vazia).
- No container da API em produção: o sharp 0.35.5 carrega, e `/data/media` tem dono `node` e aceita gravação.
- Antes e depois: 5 contas, 6 listas, 51 itens, 30 presentes e 2 chaves Pix; nenhum erro no log da API.
- De fora: `/api/healthz` e a página respondem 200. A rota de foto aceita um corpo de 4 MB (a API responde 401 sem
  sessão) e recusa 10 MB (413). Foto inexistente responde 404. A política da página tem `blob:`.
- Não conferido em produção: um envio real com conta.
- Não conferido: envio a partir de um celular real (câmera e galeria) e fotos HEIC do iPhone, que o Safari costuma
  converter para JPEG ao escolher.

## Fica para depois

Usar a foto da página da loja (LP-R34, LP-R35), várias fotos por item, recorte, ampliar em tela cheia e mandar a cópia
das fotos para fora da VPS.
