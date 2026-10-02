import { expect, test } from "vitest";
import { buildPixPayload, crc16, isValidCnpj, isValidCpf, maskPixKey, normalizePixKey, sanitizePixText } from "./pix";

test("CRC16 confere com o valor de referência do algoritmo", () => {
  expect(crc16("123456789")).toBe("29B1");
});

test("CRC confere com o exemplo do manual do BR Code", () => {
  const body = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  expect(crc16(body)).toBe("1D3D");
});

test("payload traz chave, valor, recebedor, identificador e CRC válido", () => {
  const payload = buildPixPayload({ key: "ana@email.com", name: "Ana Lúcia de Araújo Lima e Silva", city: "São Paulo", amountCents: 10000, txid: "NINHOABC123" });
  expect(payload).toContain("0014br.gov.bcb.pix0113ana@email.com");
  expect(payload).toContain("5406100.00");
  expect(payload).toContain("5924ANA LUCIA DE ARAUJO LIMA6009");
  expect(payload).toContain("6009SAO PAULO");
  expect(payload).toContain("62150511NINHOABC123");
  expect(crc16(payload.slice(0, -4))).toBe(payload.slice(-4));
});

test("payload recusa valor zero e identificador com símbolo", () => {
  const base = { key: "ana@email.com", name: "Ana", city: "Recife" };
  expect(() => buildPixPayload({ ...base, amountCents: 0, txid: "A1" })).toThrow();
  expect(() => buildPixPayload({ ...base, amountCents: 100, txid: "A-1" })).toThrow();
});

test("valida CPF e CNPJ pelos dígitos verificadores", () => {
  expect(isValidCpf("52998224725")).toBe(true);
  expect(isValidCpf("52998224724")).toBe(false);
  expect(isValidCpf("11111111111")).toBe(false);
  expect(isValidCnpj("11222333000181")).toBe(true);
  expect(isValidCnpj("11222333000182")).toBe(false);
});

test("reconhece o tipo da chave e normaliza", () => {
  expect(normalizePixKey("529.982.247-25")).toEqual({ key: "52998224725", type: "cpf" });
  expect(normalizePixKey("11.222.333/0001-81")).toEqual({ key: "11222333000181", type: "cnpj" });
  expect(normalizePixKey("(11) 98765-4321")).toEqual({ key: "+5511987654321", type: "phone" });
  expect(normalizePixKey("+55 11 98765-4321")).toEqual({ key: "+5511987654321", type: "phone" });
  expect(normalizePixKey(" Ana@Email.com ")).toEqual({ key: "ana@email.com", type: "email" });
  expect(normalizePixKey("123E4567-E12B-12D1-A456-426655440000")).toEqual({ key: "123e4567-e12b-12d1-a456-426655440000", type: "random" });
});

test("recusa o que não é chave", () => {
  expect(normalizePixKey("12345")).toBeNull();
  expect(normalizePixKey("ana@")).toBeNull();
  expect(normalizePixKey("00000000000")).toBeNull();
});

test("nome e cidade ficam sem acento, em maiúsculas e no tamanho", () => {
  expect(sanitizePixText("São José dos Campos", 15)).toBe("SAO JOSE DOS CA");
  expect(sanitizePixText("  d'Ávila & Cia. ", 25)).toBe("D AVILA CIA");
});

test("máscara mostra o suficiente para conferir, sem expor a chave", () => {
  expect(maskPixKey("52998224725", "cpf")).toBe("***.982.247-**");
  expect(maskPixKey("ana.lima@email.com", "email")).toBe("an***@email.com");
  expect(maskPixKey("+5511987654321", "phone")).toBe("+5511 *****-4321");
});
