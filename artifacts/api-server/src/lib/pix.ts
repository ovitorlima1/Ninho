/**
 * Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central), montado
 * aqui mesmo: o dinheiro vai direto do convidado para a mãe, sem intermediário.
 */
import { PIX_KEY_TYPES } from "@workspace/db/schema";

export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkDigit(digits: number[], weights: number[]): number {
  const rest = digits.reduce((sum, digit, index) => sum + digit * weights[index]!, 0) % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = [...cpf].map(Number);
  const first = checkDigit(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === d[9] && second === d[10];
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const d = [...cnpj].map(Number);
  const first = checkDigit(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === d[12] && second === d[13];
}

/**
 * Reconhece o tipo da chave e devolve no formato que o Pix espera. Onze
 * dígitos podem ser CPF ou celular: vale CPF quando os dígitos verificadores
 * batem; para forçar celular, a pessoa digita com +55.
 */
export function normalizePixKey(input: string): { key: string; type: PixKeyType } | null {
  const text = input.trim();
  if (UUID.test(text)) return { key: text.toLowerCase(), type: "random" };
  if (text.includes("@")) return EMAIL.test(text) && text.length <= 77 ? { key: text.toLowerCase(), type: "email" } : null;

  const digits = text.replace(/\D/g, "");
  const explicitPhone = text.startsWith("+");
  if (!explicitPhone && digits.length === 11 && isValidCpf(digits)) return { key: digits, type: "cpf" };
  if (!explicitPhone && digits.length === 14 && isValidCnpj(digits)) return { key: digits, type: "cnpj" };

  const national = digits.length >= 12 && digits.startsWith("55") ? digits.slice(2) : digits;
  // DDD (dois dígitos, sem zero) + número de 8 ou 9 dígitos.
  if (/^[1-9]\d(9\d{8}|[2-5]\d{7})$/.test(national)) return { key: `+55${national}`, type: "phone" };
  return null;
}

/** Maiúsculas sem acento nem símbolo: é o que os bancos aceitam nos campos de nome e cidade. */
export function sanitizePixText(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), exigido no campo 63. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const char of text) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function buildPixPayload({ key, name, city, amountCents, txid }: {
  key: string;
  name: string;
  city: string;
  amountCents: number;
  /** Identificador que aparece no extrato de quem recebe: letras e números, até 25. */
  txid: string;
}): string {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("Pix amount must be a positive integer of cents.");
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error("Pix txid must be 1-25 letters or digits.");
  const merchant = sanitizePixText(name, 25);
  const merchantCity = sanitizePixText(city, 15);
  if (!merchant || !merchantCity) throw new Error("Pix recipient name and city are required.");

  const payload = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)),
    field("52", "0000"),
    field("53", "986"),
    field("54", (amountCents / 100).toFixed(2)),
    field("58", "BR"),
    field("59", merchant),
    field("60", merchantCity),
    field("62", field("05", txid)),
    "6304",
  ].join("");
  return payload + crc16(payload);
}

/** "***.456.789-**": o convidado confere o recebedor sem ver a chave inteira. */
export function maskPixKey(key: string, type: PixKeyType): string {
  if (type === "cpf") return `***.${key.slice(3, 6)}.${key.slice(6, 9)}-**`;
  if (type === "cnpj") return `**.${key.slice(2, 5)}.${key.slice(5, 8)}/****-**`;
  if (type === "phone") return `${key.slice(0, 5)} *****-${key.slice(-4)}`;
  if (type === "email") {
    const [user = "", domain = ""] = key.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `${key.slice(0, 8)}…`;
}
