# Design técnico — foto do produto

Spec: `spec.md` (FP-R1 a FP-R21).

## Banco (só acréscimos, FP-R21)

```
media_files
  id serial pk · user_id text · key text unique (32 hex) · bytes integer · width integer · height integer · created_at
  índice: user_id

gift_list_items.photo_key text NULL      checklist_items.photo_key text NULL
```

A foto pertence à conta (`media_files`) e o item aponta para ela (`photo_key`). Uma tabela só serve aos dois tipos de
item: o limite por conta é a soma de `bytes`, e "foto órfã" é a que nenhum item aponta.

## Arquivos

- Pasta `MEDIA_DIR` (produção: `/data/media`, volume `media`; padrão local: `.data/media`). Um arquivo por foto:
  `<key>.webp`, gravado como `<key>.webp.tmp` e renomeado.
- `lib/photo.ts` (sharp): confere o formato real (JPEG, PNG ou WebP), `rotate()` pela orientação, `resize` para caber
  em 1200×1200 sem ampliar, `webp({ quality: 82 })`. O sharp não copia metadados para a saída. Limite de 60 megapixels
  na entrada. Erro de leitura vira `InvalidPhotoError` (400).
- `lib/media-rules.ts` (puro, testado): formato da chave, tipos aceitos, conta do limite.
- `lib/media-store.ts`: `savePhoto` (trata, grava, registra), `discardPhotos` (apaga linhas e arquivos),
  `sweepOrphanMedia` (FP-R13) e `deleteAllMedia` (FP-R14).

## Limpeza (FP-R12 a R14)

Trocar ou remover: a rota apaga a linha e o arquivo antigos na hora. Excluir item, categoria ou lista **não mexe em
foto**: `sweepOrphanMedia` apaga, ao subir a API e de hora em hora, as fotos com mais de 10 minutos que nenhum item
aponta, e também os arquivos sem linha no banco. Um único mecanismo cobre os cinco caminhos de exclusão e deixa o
"Desfazer" funcionar: `POST /api/me/checklist` aceita `photoKey` e religa a foto se ela é da conta e está solta.

## API

| Rota | O que faz |
|---|---|
| `PUT /api/me/checklist/:id/photo` | corpo = a imagem (`Content-Type: image/jpeg\|png\|webp`, até 8 MB) → item atualizado |
| `DELETE /api/me/checklist/:id/photo` | remove a foto → item atualizado |
| `PUT /api/me/lists/:id/items/:itemId/photo`, `DELETE …` | o mesmo para presente; responde `{ photoKey }` |
| `GET /api/media/:key` | pública; `image/webp`, `Cache-Control: public, max-age=31536000, immutable`; chave fora do formato ou sem arquivo → 404 |
| `POST /api/me/checklist` | aceita `photoKey` (Desfazer) |
| `GET /api/lists/:token`, `GET /api/gift/:token` | item público ganha `photoKey` |
| `GET /api/me/export` | + `photos` (chave, tamanho, data, endereço) |
| `DELETE /api/me/account` | apaga linhas e arquivos |

O corpo é lido com `express.raw` só nessas rotas; o resto da API continua só JSON. `Content-Type: image/*` não é
"simples" para o navegador, então um site de fora cai no preflight e na checagem de origem (FP-R19).
Ordem no envio: dono do item → limite por hora → tratar → limpar órfãs da conta → limite de 100 MB → gravar.

## Front

- `lib/photos.ts` (puro, testado): `photoUrl`, `validatePhotoFile`, limites.
- `components/photo-field.tsx`: campo com prévia (URL `blob:`), "escolher foto" / "trocar foto" / "remover foto".
  Guarda um rascunho `{ file, remove }`; quem salva o item decide o que enviar (FP-R4).
- `components/item-photo.tsx`: `<img loading="lazy" decoding="async">` com largura e altura fixas (FP-R9).
- Enxoval: `AddItemModal`/`EditItemModal` + `use-workspace` (salva o item, depois envia ou remove a foto);
  miniatura no `ItemRow`; página pública do Perfil.
- Presentes: `GiftItemModal` + `gift-list-detail`; miniatura na lista; `public-list-page` e `guest-item-modal`.

## Deploy

| Onde | Mudança |
|---|---|
| `deploy/Dockerfile` | o sharp é nativo e fica fora do bundle: `pnpm deploy --legacy --prod` gera as dependências de produção nas versões do lockfile e a imagem da API leva esse `node_modules`. Cria `/data/media` com dono `node`. |
| `deploy/compose.prod.yml` | volume `media` na API (`MEDIA_DIR=/data/media`; o resto do container segue somente leitura) e serviço `mediabackups` (tar diário em `/backups/media`, 7 dias). |
| `deploy/nginx.conf` | as duas rotas de envio aceitam até 9 MB (o resto continua em 64 KB); `img-src` ganha `blob:` para a prévia. |
| `vite.config.ts` | o mesmo `blob:` na política do build. |

## Riscos

| Risco | Tratamento |
|---|---|
| Binário do sharp não carregar na imagem (glibc, amd64) | construir a imagem `api` localmente e rodar um envio de verdade nela antes do PR |
| Volume novo montado como root e a API (usuário `node`) sem poder gravar | a pasta nasce na imagem com dono `node`; conferido no mesmo teste |
| Foto gigante travar a API | 8 MB no corpo, 60 MP na leitura, 30 envios por hora; o sharp trabalha fora da thread principal |
| Arquivo gravado e banco falhar (ou o contrário) | grava o arquivo, depois o banco numa transação; a limpeza periódica recolhe o que sobrar |
