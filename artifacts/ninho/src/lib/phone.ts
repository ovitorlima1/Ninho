/**
 * Telefone brasileiro do convidado. As mesmas regras da API
 * (`lib/db/src/schema/guestContact.ts`): o servidor sempre confere de novo,
 * aqui a regra só avisa antes de enviar.
 */

/** `+5511912345678` ou null. Aceita máscara, +55/55 na frente e um zero antes do DDD. */
export function normalizeBrPhone(input: string): string | null {
  const text = input.trim();
  if (!/^[+\d\s().-]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  else if (/^0[1-9]/.test(digits)) digits = digits.slice(1);
  return /^[1-9]\d(9\d{8}|[2-5]\d{7})$/.test(digits) ? `+55${digits}` : null;
}

/** `(11) 91234-5678`; devolve o texto como veio quando não é um número normalizado. */
export function formatBrPhone(phone: string): string {
  const match = /^\+55([1-9]\d)(\d{4,5})(\d{4})$/.exec(phone);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

/** Link para conversar no WhatsApp com um número normalizado; null se não for. */
export function whatsappLink(phone: string): string | null {
  return /^\+55\d{10,11}$/.test(phone) ? `https://wa.me/${phone.slice(1)}` : null;
}
