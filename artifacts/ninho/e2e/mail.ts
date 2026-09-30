import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { E2E_OUTBOX_DIR } from "./env";

export type SentEmail = { to: string; subject: string; text: string; html: string };

/** Todos os e-mails para o endereço, do mais antigo ao mais novo (o nome do arquivo começa pela hora). */
export async function emailsTo(to: string): Promise<SentEmail[]> {
  const files = (await readdir(E2E_OUTBOX_DIR).catch(() => [] as string[])).sort();
  const messages = await Promise.all(files.map(async (file) =>
    JSON.parse(await readFile(path.join(E2E_OUTBOX_DIR, file), "utf8")) as SentEmail));
  return messages.filter((message) => message.to === to);
}

/**
 * Espera o e-mail chegar (a API envia sem segurar a resposta) e devolve o mais
 * novo cujo assunto bate. `after` ignora os que já estavam lá.
 */
export async function waitForEmail(to: string, subject: RegExp, after = 0): Promise<SentEmail> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const matching = (await emailsTo(to)).slice(after).filter((message) => subject.test(message.subject));
    if (matching.length > 0) return matching[matching.length - 1]!;
    if (Date.now() > deadline) throw new Error(`Nenhum e-mail "${subject}" para ${to}.`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Token do link `/<rota>?token=…` do e-mail. */
export function tokenFrom(message: SentEmail, route = "/verify-email"): string {
  const match = message.text.match(new RegExp(`${route}\\?token=([A-Za-z0-9_-]+)`));
  if (!match) throw new Error(`O e-mail "${message.subject}" não tem link ${route}.`);
  return match[1]!;
}

export const CONFIRM_SUBJECT = /Confirme seu e-mail/;
