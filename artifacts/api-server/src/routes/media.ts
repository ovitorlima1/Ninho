import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Router } from "express";
import { isMediaKey } from "../lib/media-rules";
import { mediaPath } from "../lib/media-store";

const router = Router();

/**
 * GET /api/media/:key — a foto de um produto. Pública, porque o convidado vê a lista sem conta:
 * a chave aleatória é o que protege (FP-R18). O nome muda quando a foto muda, então o navegador
 * pode guardar para sempre (FP-R10).
 */
router.get("/:key", async (req, res): Promise<void> => {
  const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
  if (!isMediaKey(key)) {
    res.status(404).json({ error: "Não encontrado." });
    return;
  }
  const file = mediaPath(key);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    res.status(404).json({ error: "Não encontrado." });
    return;
  }
  res.set({
    "Content-Type": "image/webp",
    "Content-Length": String(info.size),
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
});

export default router;
