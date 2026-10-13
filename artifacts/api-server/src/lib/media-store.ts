import { randomBytes } from "node:crypto";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@workspace/db";
import { checklistItems, giftListItems, mediaFiles, type MediaFile } from "@workspace/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { isMediaKey, mediaFileName, ORPHAN_GRACE_MS } from "./media-rules";
import { type ProcessedPhoto } from "./photo";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** Pasta das fotos: o volume `media` em produção, `.data/media` ao lado do processo em desenvolvimento. */
export const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? ".data/media");

export function mediaPath(key: string): string {
  return path.join(MEDIA_DIR, mediaFileName(key));
}

export async function ensureMediaDir(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });
}

/** Apaga os arquivos das chaves. Arquivo que já não existe não é erro; o resto fica no log. */
export async function removeMediaFiles(keys: readonly string[]): Promise<void> {
  await Promise.all(keys.filter(isMediaKey).map(async (key) => {
    try {
      await unlink(mediaPath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") logger.warn({ err }, "media file removal failed");
    }
  }));
}

export async function findMedia(executor: Executor, userId: string, key: string): Promise<MediaFile | undefined> {
  const [row] = await executor.select().from(mediaFiles).where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.key, key)));
  return row;
}

/** Quanto a conta já ocupa, em bytes (FP-R15). */
export async function usedMediaBytes(executor: Executor, userId: string): Promise<number> {
  const [row] = await executor.select({ total: sql<string>`coalesce(sum(${mediaFiles.bytes}), 0)` })
    .from(mediaFiles).where(eq(mediaFiles.userId, userId));
  return Number(row?.total ?? 0);
}

/** Algum item (do Enxoval ou presente) aponta para esta foto? */
export async function isMediaLinked(executor: Executor, key: string): Promise<boolean> {
  const [item] = await executor.select({ id: checklistItems.id }).from(checklistItems).where(eq(checklistItems.photoKey, key)).limit(1);
  if (item) return true;
  const [gift] = await executor.select({ id: giftListItems.id }).from(giftListItems).where(eq(giftListItems.photoKey, key)).limit(1);
  return Boolean(gift);
}

/**
 * Grava o arquivo com um nome aleatório. Vai primeiro para um nome provisório e só então é
 * renomeado: quem pede a foto nunca recebe um arquivo pela metade.
 */
export async function writeMediaFile(photo: ProcessedPhoto): Promise<string> {
  const key = randomBytes(16).toString("hex");
  const target = mediaPath(key);
  await writeFile(`${target}.tmp`, photo.data, { mode: 0o640 });
  await rename(`${target}.tmp`, target);
  return key;
}

export async function insertMedia(tx: Tx, userId: string, key: string, photo: ProcessedPhoto): Promise<void> {
  await tx.insert(mediaFiles).values({ userId, key, bytes: photo.data.length, width: photo.width, height: photo.height });
}

/** Tira a foto da conta: linha e arquivo (FP-R12). */
export async function discardMedia(userId: string, key: string): Promise<void> {
  await db.delete(mediaFiles).where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.key, key)));
  await removeMediaFiles([key]);
}

/** Linhas de todas as fotos da conta; quem chama apaga os arquivos depois que a transação fecha (FP-R14). */
export async function deleteAllMedia(tx: Tx, userId: string): Promise<string[]> {
  const rows = await tx.delete(mediaFiles).where(eq(mediaFiles.userId, userId)).returning({ key: mediaFiles.key });
  return rows.map((row) => row.key);
}

const notLinked = sql`NOT EXISTS (SELECT 1 FROM ${checklistItems} WHERE ${checklistItems.photoKey} = ${mediaFiles.key})
  AND NOT EXISTS (SELECT 1 FROM ${giftListItems} WHERE ${giftListItems.photoKey} = ${mediaFiles.key})`;

/**
 * Apaga as fotos que nenhum item aponta há mais de dez minutos (FP-R13): é assim que excluir um
 * item, uma categoria ou uma lista leva a foto junto, sem cada rota precisar saber de arquivo, e
 * com tempo para o "Desfazer". Com `userId`, limpa só aquela conta (antes de conferir o limite).
 */
export async function sweepOrphanMedia(userId?: string, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ORPHAN_GRACE_MS);
  const rows = await db.delete(mediaFiles)
    .where(and(lt(mediaFiles.createdAt, cutoff), userId ? eq(mediaFiles.userId, userId) : undefined, notLinked))
    .returning({ key: mediaFiles.key });
  await removeMediaFiles(rows.map((row) => row.key));
  return rows.length;
}

/** Arquivos sem linha no banco (um envio interrompido no meio): saem depois de uma hora. */
async function removeStrayFiles(now = Date.now()): Promise<number> {
  const names = await readdir(MEDIA_DIR);
  const known = new Set((await db.select({ key: mediaFiles.key }).from(mediaFiles)).map((row) => row.key));
  let removed = 0;
  for (const name of names) {
    const key = name.split(".")[0] ?? "";
    if (known.has(key)) continue;
    const file = path.join(MEDIA_DIR, name);
    const info = await stat(file).catch(() => null);
    if (!info?.isFile() || now - info.mtimeMs < 60 * 60_000) continue;
    await unlink(file).catch(() => undefined);
    removed += 1;
  }
  return removed;
}

/** Limpeza completa: ao subir a API e de hora em hora. Falha aqui nunca derruba a API. */
export async function runMediaCleanup(): Promise<void> {
  try {
    await ensureMediaDir();
    const orphans = await sweepOrphanMedia();
    const strays = await removeStrayFiles();
    if (orphans + strays > 0) logger.info({ orphans, strays }, "Media cleanup");
  } catch (err) {
    logger.error({ err }, "Media cleanup error");
  }
}
