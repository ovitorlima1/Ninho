/**
 * Nome e telefone do convidado, lembrados só neste aparelho para preencher o
 * próximo formulário (CC-R18). Nada disso vai para o servidor por causa daqui.
 */
import { formatBrPhone, normalizeBrPhone } from "@/lib/phone";

export interface GuestContact {
  name: string;
  phone: string;
}

const STORAGE_KEY = "ninho:convidado";

export const EMPTY_CONTACT: GuestContact = { name: "", phone: "" };

export function readGuestContact(): GuestContact | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const { name, phone } = parsed as Record<string, unknown>;
    if (typeof name !== "string" || typeof phone !== "string") return null;
    const normalized = normalizeBrPhone(phone);
    if (name.trim().length < 2 || name.length > 120 || !normalized) return null;
    return { name: name.trim(), phone: formatBrPhone(normalized) };
  } catch {
    return null;
  }
}

export function saveGuestContact(contact: GuestContact): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: contact.name.trim(), phone: contact.phone }));
  } catch {
    // Navegação privada sem armazenamento: a reserva vale, só não fica lembrada neste aparelho.
  }
}

export type ContactErrors = { name?: string; phone?: string };

export function validateContact({ name, phone }: GuestContact): ContactErrors {
  const errors: ContactErrors = {};
  if (name.trim().length < 2) errors.name = "Informe seu nome (pelo menos 2 letras).";
  if (!phone.trim()) errors.phone = "Informe seu WhatsApp com DDD.";
  else if (!normalizeBrPhone(phone)) errors.phone = "Esse WhatsApp não parece certo. Use o DDD, por exemplo (11) 91234-5678.";
  return errors;
}
