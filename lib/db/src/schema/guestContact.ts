import { z } from "zod/v4";

/**
 * Nome e telefone de quem escolhe um presente. Regras puras (sem banco): a API
 * as usa nos esquemas e nos testes, e o front tem uma cópia pequena em
 * `ninho/src/lib/phone.ts`, com os mesmos casos.
 */
export const GUEST_NAME_MIN = 2;
export const GUEST_NAME_MAX = 120;
export const PHONE_MESSAGE = "Informe um WhatsApp com DDD, por exemplo (11) 91234-5678.";
export const NAME_MESSAGE = "Informe seu nome (pelo menos 2 letras).";

/**
 * Telefone brasileiro com DDD, em formato internacional (`+5511912345678`), ou
 * null. Aceita máscara, `+55`/`55` na frente e um zero antes do DDD. Celular
 * tem 9 dígitos e começa em 9; fixo tem 8 e começa em 2 a 5.
 */
export function normalizeBrPhone(input: string): string | null {
  const text = input.trim();
  if (!/^[+\d\s().-]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  else if (/^0[1-9]/.test(digits)) digits = digits.slice(1);
  return /^[1-9]\d(9\d{8}|[2-5]\d{7})$/.test(digits) ? `+55${digits}` : null;
}

export const guestNameSchema = z
  .string({ error: "Informe seu nome." })
  .trim()
  .min(GUEST_NAME_MIN, NAME_MESSAGE)
  .max(GUEST_NAME_MAX, "O nome pode ter até 120 caracteres.");

/** Aceita o que a pessoa digitou e entrega o número já normalizado. */
export const guestPhoneSchema = z
  .string({ error: "Informe seu WhatsApp com DDD." })
  .trim()
  .refine((value) => normalizeBrPhone(value) !== null, PHONE_MESSAGE)
  .transform((value) => normalizeBrPhone(value)!);
