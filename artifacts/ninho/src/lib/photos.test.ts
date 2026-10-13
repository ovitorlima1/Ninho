import assert from "node:assert/strict";
import { test } from "vitest";
import { PHOTO_ACCEPT, PHOTO_MAX_BYTES, photoUrl, validatePhotoFile } from "./photos";

test("JPEG, PNG e WebP até 8 MB passam", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(validatePhotoFile({ type, size: 2_000_000 }), null, type);
  }
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: PHOTO_MAX_BYTES }), null);
  assert.equal(PHOTO_ACCEPT, "image/jpeg,image/png,image/webp");
});

test("outro tipo de arquivo é recusado com o que serve", () => {
  for (const type of ["application/pdf", "image/gif", "image/heic", "image/svg+xml", "video/mp4", ""]) {
    assert.equal(validatePhotoFile({ type, size: 1000 }), "Escolha uma foto em JPEG, PNG ou WebP.", type);
  }
});

test("foto acima de 8 MB ou vazia é recusada antes de enviar", () => {
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 }), "A foto passa de 8 MB. Escolha uma menor.");
  assert.equal(validatePhotoFile({ type: "image/png", size: 0 }), "Este arquivo está vazio. Escolha outra foto.");
});

test("o endereço da foto é a rota de mídia com a chave", () => {
  assert.equal(photoUrl("0123456789abcdef0123456789abcdef"), "/api/media/0123456789abcdef0123456789abcdef");
});
