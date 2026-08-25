import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL must be set to a verified Resend sender.");
  }

  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Redefina sua senha do Ninho",
      text: [
        "Você pediu para redefinir sua senha do Ninho.",
        "",
        `Acesse este link temporário para criar uma nova senha: ${resetUrl}`,
        "",
        "Se não foi você, ignore este e-mail. O link expira em 1 hora.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#24202a;max-width:560px">
          <h1 style="color:#8e49b7">Redefina sua senha</h1>
          <p>Você pediu para criar uma nova senha para o seu Ninho.</p>
          <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;color:#fff;background:#9f52ce;text-decoration:none">Criar nova senha</a></p>
          <p>Este link expira em 1 hora e só pode ser usado uma vez.</p>
          <p>Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend rejected the password reset email (${response.status}): ${details.slice(0, 200)}`);
  }
}