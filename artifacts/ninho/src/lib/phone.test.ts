import { expect, test } from "vitest";
import { formatBrPhone, normalizeBrPhone, whatsappLink } from "@/lib/phone";

test("celular com máscara, com +55 e sem nada viram o mesmo número", () => {
  for (const input of ["(11) 91234-5678", "11912345678", "+55 11 91234-5678", "55 (11) 9 1234-5678", "011 91234-5678", " 11 9 1234 5678 "]) {
    expect(normalizeBrPhone(input), input).toBe("+5511912345678");
  }
});

test("fixo de 8 dígitos vale e DDD 55 não é confundido com o país", () => {
  expect(normalizeBrPhone("(21) 2345-6789")).toBe("+552123456789");
  expect(normalizeBrPhone("(55) 99123-4567")).toBe("+5555991234567");
  expect(normalizeBrPhone("+55 55 99123-4567")).toBe("+5555991234567");
});

test("recusa número curto, longo, sem DDD, com letra ou que não é celular nem fixo", () => {
  for (const input of ["", "   ", "91234-5678", "(11) 1234-567", "(11) 912345678901", "(11) 81234-5678", "(00) 91234-5678", "telefone", "abc@dominio.com"]) {
    expect(normalizeBrPhone(input), input).toBeNull();
  }
});

test("formata para mostrar e monta o link do WhatsApp", () => {
  expect(formatBrPhone("+5511912345678")).toBe("(11) 91234-5678");
  expect(formatBrPhone("+552123456789")).toBe("(21) 2345-6789");
  expect(formatBrPhone("sem número")).toBe("sem número");
  expect(whatsappLink("+5511912345678")).toBe("https://wa.me/5511912345678");
  expect(whatsappLink("11912345678")).toBeNull();
});
