import assert from "node:assert/strict";
import sharp from "sharp";
import { test } from "vitest";
import { MEDIA_QUOTA_BYTES, fitsQuota, isMediaKey, mediaFileName } from "./media-rules";
import { InvalidPhotoError, processPhoto } from "./photo";

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 160 } } });

test("foto grande é reduzida para caber em 1200px, sem deformar, e sai em WebP", async () => {
  const photo = await processPhoto(await solid(3000, 2000).jpeg().toBuffer());
  assert.deepEqual([photo.width, photo.height], [1200, 800]);
  assert.equal((await sharp(photo.data).metadata()).format, "webp");

  const tall = await processPhoto(await solid(1000, 4000).png().toBuffer());
  assert.deepEqual([tall.width, tall.height], [300, 1200]);
});

test("foto pequena não é ampliada", async () => {
  const photo = await processPhoto(await solid(300, 200).webp().toBuffer());
  assert.deepEqual([photo.width, photo.height], [300, 200]);
});

test("localização e dados do aparelho não passam para a foto guardada", async () => {
  const input = await solid(800, 600).jpeg().withExif({
    IFD0: { Make: "Ninho Phone", Model: "N1" },
    IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "46/1 38/1 0/1" },
  }).toBuffer();
  // A entrada tem mesmo os metadados: sem isso o teste passaria à toa.
  const before = await sharp(input).metadata();
  assert.ok(before.exif && before.exif.includes("Ninho Phone"));

  const photo = await processPhoto(input);
  const after = await sharp(photo.data).metadata();
  assert.equal(after.exif, undefined);
  assert.equal(after.xmp, undefined);
  assert.equal(after.iptc, undefined);
  assert.equal(photo.data.includes("Ninho Phone"), false);
});

test("foto tirada de lado é endireitada antes de perder a orientação", async () => {
  const input = await solid(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const photo = await processPhoto(input);
  assert.deepEqual([photo.width, photo.height], [200, 400]);
  assert.equal((await sharp(photo.data).metadata()).orientation, undefined);
});

test("o que não é JPEG, PNG ou WebP é recusado, diga o navegador o que disser", async () => {
  const cases: Record<string, Buffer> = {
    pdf: Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"),
    texto: Buffer.from("isto não é uma foto"),
    vazio: Buffer.alloc(0),
    svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'),
    gif: await solid(10, 10).gif().toBuffer(),
    cortado: (await solid(800, 600).jpeg().toBuffer()).subarray(0, 400),
  };
  for (const [name, buffer] of Object.entries(cases)) {
    await assert.rejects(processPhoto(buffer), InvalidPhotoError, name);
  }
});

test("chave da foto: só 32 hexadecimais, nada que pareça caminho", () => {
  assert.equal(isMediaKey("0123456789abcdef0123456789abcdef"), true);
  assert.equal(mediaFileName("0123456789abcdef0123456789abcdef"), "0123456789abcdef0123456789abcdef.webp");
  for (const bad of ["", "../../etc/passwd", "0123456789abcdef0123456789abcde", "0123456789ABCDEF0123456789ABCDEF",
    "0123456789abcdef0123456789abcdef.webp", "0123456789abcdef/123456789abcdef", null, 42]) {
    assert.equal(isMediaKey(bad), false, String(bad));
  }
});

test("limite por conta: trocar uma foto devolve o espaço da antiga", () => {
  const mb = 1024 * 1024;
  assert.equal(fitsQuota(0, 300_000), true);
  assert.equal(fitsQuota(MEDIA_QUOTA_BYTES - mb, mb), true);
  assert.equal(fitsQuota(MEDIA_QUOTA_BYTES - mb, mb + 1), false);
  assert.equal(fitsQuota(MEDIA_QUOTA_BYTES, 500_000, 400_000), false);
  assert.equal(fitsQuota(MEDIA_QUOTA_BYTES, 400_000, 400_000), true);
});
