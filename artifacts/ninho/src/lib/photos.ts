/**
 * Fotos de produto (presentes e itens do Enxoval): endereço, limites e a conferência que o
 * aparelho já consegue fazer antes de enviar. O servidor confere tudo de novo.
 */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_ACCEPT = PHOTO_TYPES.join(",");

/** O que a mãe mexeu na foto dentro do diálogo; só vale quando ela salva o item (FP-R4). */
export type PhotoDraft = { file: File | null; remove: boolean };
export const NO_PHOTO_CHANGE: PhotoDraft = { file: null, remove: false };

export function photoUrl(key: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/media/${key}`;
}

/** Motivo da recusa em português, ou null se o arquivo pode ser enviado (FP-R3). */
export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Escolha uma foto em JPEG, PNG ou WebP.";
  if (file.size > PHOTO_MAX_BYTES) return "A foto passa de 8 MB. Escolha uma menor.";
  if (file.size === 0) return "Este arquivo está vazio. Escolha outra foto.";
  return null;
}
