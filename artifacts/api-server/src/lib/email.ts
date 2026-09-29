import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type EmailTransport = "resend" | "log" | "outbox";

/**
 * Como o e-mail sai. Em produção só o Resend vale; fora dela dá para mandar
 * para o log (desenvolvimento local, onde o Resend não funciona) ou para uma
 * pasta de arquivos JSON (E2E, que lê o link de lá).
 */
export function resolveEmailTransport(env: NodeJS.ProcessEnv = process.env): EmailTransport {
  const transport = env.EMAIL_TRANSPORT || "resend";
  if (transport !== "resend" && transport !== "log" && transport !== "outbox") {
    throw new Error(`EMAIL_TRANSPORT inválido: "${transport}". Use resend, log ou outbox.`);
  }
  if (transport !== "resend" && env.NODE_ENV === "production") {
    throw new Error(`EMAIL_TRANSPORT=${transport} não é permitido em produção.`);
  }
  return transport;
}

async function sendWithResend(message: EmailMessage): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL must be set to a verified Resend sender.");
  }

  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend rejected the email "${message.subject}" (${response.status}): ${details.slice(0, 200)}`);
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const transport = resolveEmailTransport();
  if (transport === "resend") {
    await sendWithResend(message);
    return;
  }
  if (transport === "log") {
    // Só fora de produção: o texto traz o link, e é para quem roda o app localmente copiar.
    logger.info({ event: "email_not_sent", subject: message.subject, text: message.text }, "e-mail no log (EMAIL_TRANSPORT=log)");
    return;
  }
  const dir = process.env.EMAIL_OUTBOX_DIR;
  if (!dir) throw new Error("EMAIL_OUTBOX_DIR must be set when EMAIL_TRANSPORT=outbox.");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(message));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Paleta ameixa do app (tokens.css): o e-mail não lê CSS externo.
const INK = "#2a1c26";
const BRAND = "#82376f";
const MUTED = "#6c5c67";

function layout(title: string, paragraphs: string[], button?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  const action = button
    ? `<p style="margin:20px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 20px;border-radius:999px;color:#ffffff;background:${BRAND};text-decoration:none;font-weight:700">${escapeHtml(button.label)}</a></p>`
    : "";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:${INK};max-width:560px">
      <h1 style="margin:0 0 16px;font-size:24px;color:${BRAND}">${escapeHtml(title)}</h1>
      ${body}${action}
      <p style="margin:16px 0 0;font-size:13px;color:${MUTED}">Ninho · organização de enxoval</p>
    </div>
  `;
}

export function passwordResetMessage(to: string, resetUrl: string): EmailMessage {
  return {
    to,
    subject: "Redefina sua senha do Ninho",
    text: [
      "Você pediu para redefinir sua senha do Ninho.",
      "",
      `Acesse este link temporário para criar uma nova senha: ${resetUrl}`,
      "",
      "Se não foi você, ignore este e-mail. O link expira em 1 hora.",
    ].join("\n"),
    html: layout("Redefina sua senha", [
      "Você pediu para criar uma nova senha para o seu Ninho.",
      "Este link expira em 1 hora e só pode ser usado uma vez.",
      "Se não foi você, ignore este e-mail.",
    ], { label: "Criar nova senha", url: resetUrl }),
  };
}

export function verificationMessage(to: string, verifyUrl: string): EmailMessage {
  return {
    to,
    subject: "Confirme seu e-mail no Ninho",
    text: [
      "Falta só confirmar que este e-mail é seu para abrir o seu Ninho.",
      "",
      `Confirme por este link: ${verifyUrl}`,
      "",
      "O link vale por 24 horas e só pode ser usado uma vez. Se você não criou uma conta, ignore este e-mail.",
    ].join("\n"),
    html: layout("Confirme seu e-mail", [
      "Falta só confirmar que este e-mail é seu para abrir o seu Ninho.",
      "O link vale por 24 horas e só pode ser usado uma vez.",
      "Se você não criou uma conta, ignore este e-mail.",
    ], { label: "Confirmar meu e-mail", url: verifyUrl }),
  };
}

export function accountExistsMessage(to: string, signInUrl: string, resetUrl: string): EmailMessage {
  return {
    to,
    subject: "Você já tem uma conta no Ninho",
    text: [
      "Alguém tentou criar uma conta no Ninho com este e-mail, mas ele já tem uma conta.",
      "",
      `Para entrar: ${signInUrl}`,
      `Esqueceu a senha? Crie outra aqui: ${resetUrl}`,
      "",
      "Se não foi você, pode ignorar este e-mail: nada mudou na sua conta.",
    ].join("\n"),
    html: layout("Você já tem uma conta", [
      "Alguém tentou criar uma conta no Ninho com este e-mail, mas ele já tem uma conta.",
      `Esqueceu a senha? <a href="${escapeHtml(resetUrl)}" style="color:${BRAND}">Crie uma nova aqui</a>.`,
      "Se não foi você, pode ignorar este e-mail: nada mudou na sua conta.",
    ], { label: "Entrar no meu ninho", url: signInUrl }),
  };
}
