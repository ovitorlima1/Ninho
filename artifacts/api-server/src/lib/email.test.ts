import { expect, test } from "vitest";
import { accountExistsMessage, resolveEmailTransport, verificationMessage } from "./email";

test("sem EMAIL_TRANSPORT o e-mail vai pelo Resend", () => {
  expect(resolveEmailTransport({ NODE_ENV: "production" })).toBe("resend");
  expect(resolveEmailTransport({})).toBe("resend");
});

test("log e pasta só valem fora de produção", () => {
  expect(resolveEmailTransport({ EMAIL_TRANSPORT: "outbox", NODE_ENV: "development" })).toBe("outbox");
  expect(resolveEmailTransport({ EMAIL_TRANSPORT: "log" })).toBe("log");
  expect(() => resolveEmailTransport({ EMAIL_TRANSPORT: "outbox", NODE_ENV: "production" })).toThrow(/produção/);
  expect(() => resolveEmailTransport({ EMAIL_TRANSPORT: "log", NODE_ENV: "production" })).toThrow(/produção/);
});

test("transporte desconhecido é recusado", () => {
  expect(() => resolveEmailTransport({ EMAIL_TRANSPORT: "smtp" })).toThrow(/inválido/);
});

test("links entram escapados no HTML", () => {
  const url = "https://ninho.test/verify-email?token=a&b=\"x\"";
  const message = verificationMessage("ana@teste.local", url);
  expect(message.text).toContain(url);
  expect(message.html).toContain("token=a&amp;b=&quot;x&quot;");
  expect(message.html).not.toContain("b=\"x\"");
});

test("aviso de conta existente traz entrar e redefinir", () => {
  const message = accountExistsMessage("ana@teste.local", "https://ninho.test/sign-in", "https://ninho.test/forgot-password");
  expect(message.text).toContain("https://ninho.test/sign-in");
  expect(message.text).toContain("https://ninho.test/forgot-password");
});
