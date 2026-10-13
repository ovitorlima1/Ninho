import sharp from "sharp";
import { PHOTO_MAX_SIDE } from "./media-rules";

/** O arquivo não é uma foto que a gente aceite (ou não abre). */
export class InvalidPhotoError extends Error {
  constructor() {
    super("invalid photo");
    this.name = "InvalidPhotoError";
  }
}

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
/** Bem acima da câmera de um celular; segura uma imagem montada para estourar a memória. */
const MAX_INPUT_PIXELS = 60_000_000;

export type ProcessedPhoto = { data: Buffer; width: number; height: number };

/**
 * Trata a foto enviada (FP-R2): confere o formato de verdade (não o que o navegador disse),
 * endireita pela orientação da câmera, reduz para caber em 1200×1200 e regrava em WebP. O sharp
 * não leva metadados para a saída, então localização, aparelho e data ficam para trás.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  try {
    const image = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS, animated: false });
    const { format } = await image.metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) throw new InvalidPhotoError();
    const { data, info } = await image
      .rotate()
      .resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    // Qualquer falha de leitura é, para quem enviou, "isto não é uma foto".
    throw new InvalidPhotoError();
  }
}
