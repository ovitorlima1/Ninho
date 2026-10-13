import { MEDIA_KEY_PATTERN } from "@workspace/db/schema";

/**
 * Regras das fotos de produto, sem banco nem disco: o que entra, quanto cabe e como o arquivo
 * se chama.
 */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
/** Maior lado da foto guardada, em pixels. */
export const PHOTO_MAX_SIDE = 1200;
export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Limite de fotos por conta, somando os arquivos já tratados (FP-R15). */
export const MEDIA_QUOTA_BYTES = 100 * 1024 * 1024;
/** Foto que nenhum item aponta só é apagada depois deste tempo: é a janela do "Desfazer" (FP-R13). */
export const ORPHAN_GRACE_MS = 10 * 60_000;

/** A chave é o único caminho até o arquivo: 32 hexadecimais, nada que pareça caminho (FP-R18). */
export function isMediaKey(value: unknown): value is string {
  return typeof value === "string" && MEDIA_KEY_PATTERN.test(value);
}

export function mediaFileName(key: string): string {
  return `${key}.webp`;
}

/** Cabe no limite? Trocar uma foto devolve o espaço da antiga. */
export function fitsQuota(usedBytes: number, newBytes: number, replacedBytes = 0): boolean {
  return usedBytes - replacedBytes + newBytes <= MEDIA_QUOTA_BYTES;
}
