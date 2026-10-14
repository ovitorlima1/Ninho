import { expect, test } from "vitest";
import { createPledgeSchema, guestNameSchema, guestPhoneSchema, normalizeBrPhone, reserveGiftSchema } from "@workspace/db/schema";

test("celular com máscara, com +55 e sem nada viram o mesmo número", () => {
  for (const input of ["(11) 91234-5678", "11912345678", "+55 11 91234-5678", "55 (11) 9 1234-5678", "011 91234-5678", " 11 9 1234 5678 "]) {
    expect(normalizeBrPhone(input), input).toBe("+5511912345678");
  }
});

test("fixo de 8 dígitos vale", () => {
  expect(normalizeBrPhone("(21) 2345-6789")).toBe("+552123456789");
});

test("DDD 55 não é confundido com o código do país", () => {
  expect(normalizeBrPhone("(55) 99123-4567")).toBe("+5555991234567");
  expect(normalizeBrPhone("+55 55 99123-4567")).toBe("+5555991234567");
  expect(normalizeBrPhone("(55) 3212-3456")).toBe("+555532123456");
});

test("recusa número curto, longo, sem DDD, com letra ou que não é celular nem fixo", () => {
  for (const input of ["", "   ", "91234-5678", "(11) 1234-567", "(11) 912345678901", "(11) 81234-5678", "(11) 1234-5678", "(00) 91234-5678", "telefone", "11 91234-5678 ramal 2", "abc@dominio.com"]) {
    expect(normalizeBrPhone(input), input).toBeNull();
  }
});

test("nome precisa de 2 caracteres e perde os espaços das pontas", () => {
  expect(guestNameSchema.safeParse("a").success).toBe(false);
  expect(guestNameSchema.safeParse("   ").success).toBe(false);
  expect(guestNameSchema.safeParse("x".repeat(121)).success).toBe(false);
  expect(guestNameSchema.parse("  Tia Rosa ")).toBe("Tia Rosa");
});

test("o esquema do telefone entrega o número normalizado e dá a mensagem certa", () => {
  expect(guestPhoneSchema.parse("(11) 91234-5678")).toBe("+5511912345678");
  const refused = guestPhoneSchema.safeParse("123");
  expect(refused.success).toBe(false);
  expect(refused.error?.issues[0]?.message).toMatch(/WhatsApp com DDD/);
});

test("reserva do Enxoval exige nome e telefone; mostrar o nome vem ligado", () => {
  const ok = reserveGiftSchema.parse({ itemId: 1, guestName: "Tia Rosa", guestPhone: "11 91234-5678" });
  expect(ok).toMatchObject({ guestName: "Tia Rosa", guestPhone: "+5511912345678", showName: true, status: "vou presentear" });
  expect(reserveGiftSchema.safeParse({ itemId: 1, guestName: "Tia Rosa" }).success).toBe(false);
  expect(reserveGiftSchema.safeParse({ itemId: 1, guestPhone: "11 91234-5678" }).success).toBe(false);
  expect(reserveGiftSchema.safeParse({ itemId: 1, guestName: null, guestPhone: "11 91234-5678" }).success).toBe(false);
});

test("contribuição de Presentes exige nome e telefone", () => {
  const base = { itemId: 1, kind: "units" as const, units: 2 };
  expect(createPledgeSchema.safeParse(base).success).toBe(false);
  expect(createPledgeSchema.safeParse({ ...base, guestName: "Ju" }).success).toBe(false);
  expect(createPledgeSchema.parse({ ...base, guestName: "Ju", guestPhone: "(11) 91234-5678" }).guestPhone).toBe("+5511912345678");
});
