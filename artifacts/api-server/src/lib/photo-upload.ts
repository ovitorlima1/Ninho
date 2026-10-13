import express, { type NextFunction, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { mediaFiles } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { fitsQuota, MEDIA_QUOTA_BYTES, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from "./media-rules";
import { findMedia, insertMedia, removeMediaFiles, sweepOrphanMedia, usedMediaBytes, writeMediaFile } from "./media-store";
import { InvalidPhotoError, processPhoto } from "./photo";
import { limiterKey, photoUploadLimiter } from "./rate-limit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** O item foi apagado enquanto a foto subia: a transação desfaz tudo e nada fica gravado. */
class ItemGoneError extends Error {}

const rawPhoto = express.raw({ type: [...PHOTO_CONTENT_TYPES], limit: PHOTO_MAX_BYTES });

/**
 * Lê o corpo da requisição como a própria imagem. Só as rotas de foto usam: o resto da API
 * continua aceitando apenas JSON. `image/*` não é um tipo que um formulário de outro site
 * consiga enviar, então a proteção contra CSRF continua valendo (FP-R19).
 */
export function photoBody(req: Request, res: Response, next: NextFunction): void {
  rawPhoto(req, res, (err?: unknown) => {
    if (err && typeof err === "object" && "type" in err && err.type === "entity.too.large") {
      res.status(413).json({ error: "A foto passa de 8 MB. Escolha uma menor." });
      return;
    }
    next(err);
  });
}

/**
 * Recebe a foto de um item e a põe no lugar da anterior. `link` grava a chave nova no item,
 * dentro da transação, e devolve o item (ou nada, se ele sumiu no meio do caminho).
 * Devolve `undefined` quando já respondeu com o motivo da recusa.
 */
export async function receivePhoto<T>(
  req: Request,
  res: Response,
  { userId, currentKey, link }: { userId: string; currentKey: string | null; link: (tx: Tx, key: string) => Promise<T | undefined> },
): Promise<T | undefined> {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(415).json({ error: "Envie uma foto em JPEG, PNG ou WebP." });
    return undefined;
  }

  const rate = await photoUploadLimiter.consume([limiterKey("photo-upload:account", userId)]);
  if (!rate.allowed) {
    res.set("Retry-After", String(rate.retryAfterSeconds));
    res.status(429).json({ error: "Muitas fotos em pouco tempo. Tente de novo daqui a pouco.", retryAfterSeconds: rate.retryAfterSeconds });
    return undefined;
  }

  let photo;
  try {
    photo = await processPhoto(body);
  } catch (err) {
    if (!(err instanceof InvalidPhotoError)) throw err;
    res.status(400).json({ error: "Não conseguimos abrir esta foto. Tente outra imagem em JPEG, PNG ou WebP." });
    return undefined;
  }

  // Fotos de itens já apagados não podem segurar o espaço de quem quer enviar outra.
  await sweepOrphanMedia(userId);
  const current = currentKey ? await findMedia(db, userId, currentKey) : undefined;
  if (!fitsQuota(await usedMediaBytes(db, userId), photo.data.length, current?.bytes ?? 0)) {
    res.status(409).json({ error: `Você chegou ao limite de ${MEDIA_QUOTA_BYTES / (1024 * 1024)} MB de fotos. Remova alguma para enviar outra.` });
    return undefined;
  }

  const key = await writeMediaFile(photo);
  let linked: T | undefined;
  try {
    linked = await db.transaction(async (tx) => {
      await insertMedia(tx, userId, key, photo);
      const item = await link(tx, key);
      if (!item) throw new ItemGoneError();
      if (currentKey) await tx.delete(mediaFiles).where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.key, currentKey)));
      return item;
    });
  } catch (err) {
    await removeMediaFiles([key]);
    if (!(err instanceof ItemGoneError)) throw err;
  }
  if (!linked) {
    res.status(404).json({ error: "Não encontramos esse item. Atualize a página e tente de novo." });
    return undefined;
  }
  // O arquivo antigo sai na hora (FP-R12).
  if (currentKey) await removeMediaFiles([currentKey]);
  return linked;
}
