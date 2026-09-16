import { expect, test } from "vitest";
import { isAllowedOrigin, type OriginCheck } from "./security";

const base: OriginCheck = {
  method: "POST",
  origin: undefined,
  secFetchSite: undefined,
  hostname: "ninho-mother.replit.app",
  production: true,
  allowedOrigins: [],
};

test("leituras nunca são bloqueadas", () => {
  expect(isAllowedOrigin({ ...base, method: "GET", origin: "https://mal.example" })).toBe(true);
});

test("mesmo host passa; outro site não", () => {
  expect(isAllowedOrigin({ ...base, origin: "https://ninho-mother.replit.app" })).toBe(true);
  expect(isAllowedOrigin({ ...base, origin: "https://mal.example" })).toBe(false);
  expect(isAllowedOrigin({ ...base, method: "delete", origin: "https://mal.example" })).toBe(false);
});

test("sem Origin passa, a menos que o navegador diga cross-site", () => {
  expect(isAllowedOrigin(base)).toBe(true);
  expect(isAllowedOrigin({ ...base, secFetchSite: "same-origin" })).toBe(true);
  expect(isAllowedOrigin({ ...base, secFetchSite: "cross-site" })).toBe(false);
});

test("Origin nula ou inválida é recusada", () => {
  expect(isAllowedOrigin({ ...base, origin: "null" })).toBe(false);
  expect(isAllowedOrigin({ ...base, origin: "não é url" })).toBe(false);
});

test("origens configuradas passam", () => {
  expect(isAllowedOrigin({ ...base, origin: "https://ninho.app", allowedOrigins: ["https://ninho.app"] })).toBe(true);
});

test("localhost só vale fora de produção", () => {
  expect(isAllowedOrigin({ ...base, hostname: "localhost", origin: "http://localhost:5190" })).toBe(true);
  expect(isAllowedOrigin({ ...base, hostname: "api.interna", origin: "http://localhost:5190" })).toBe(false);
  expect(isAllowedOrigin({ ...base, hostname: "api.interna", origin: "http://localhost:5190", production: false })).toBe(true);
});
