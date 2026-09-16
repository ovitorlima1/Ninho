import { expect, test } from "vitest";
import { errSerializer } from "./logger";

class FakeQueryError extends Error {
  constructor(readonly query: string, readonly params: unknown[], options?: { cause?: unknown }) {
    super(`Failed query: ${query}\nparams: ${params}`, options);
  }
}

test("erro de consulta vai para o log sem os valores", () => {
  const cause = Object.assign(new Error("duplicate key value violates unique constraint"), {
    detail: "Key (email)=(maria@teste.local) already exists.",
  });
  const err = new FakeQueryError("insert into t values ($1, $2)", ["maria@teste.local", "notas\nsecretas"], { cause });
  const text = JSON.stringify(errSerializer(err));
  expect(text).not.toContain("maria@teste.local");
  expect(text).not.toContain("secretas");
  expect(text).toContain("insert into t values ($1, $2)");
  expect(text).toContain("params: [Redacted]");
});

test("erro comum passa como está", () => {
  const serialized = errSerializer(new Error("falhou")) as { message: string };
  expect(serialized.message).toBe("falhou");
});
