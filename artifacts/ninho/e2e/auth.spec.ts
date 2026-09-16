import { expect, test } from "@playwright/test";
import { withTestDb } from "./db";
import { expectAccessible, isoDaysFromToday, PASSWORD, uniqueEmail } from "./support";

test("cadastro valida por campo e o onboarding leva ao Início", async ({ page }) => {
  await page.goto("/sign-up");
  await expectAccessible(page);

  await page.getByTestId("input-auth-email").fill("email-invalido");
  await page.getByTestId("input-auth-password").fill("abc");
  await page.getByTestId("input-auth-confirmation").fill("xyz");
  await page.getByTestId("button-auth-submit").click();

  await expect(page.getByText("Confira o e-mail: parece faltar algo.")).toBeVisible();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible();
  await expect(page.getByTestId("input-auth-email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("input-auth-email")).toBeFocused();
  await expectAccessible(page);

  await page.getByTestId("input-auth-email").fill(uniqueEmail("cadastro"));
  await page.getByTestId("input-auth-password").fill(PASSWORD);
  await page.getByTestId("input-auth-confirmation").fill(PASSWORD);
  await page.getByTestId("button-auth-submit").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Como posso te chamar?" })).toBeVisible();
  await expect(page.getByTestId("input-onboarding-name")).toBeFocused();
  await expectAccessible(page);

  await page.getByTestId("input-onboarding-name").fill("Bia");
  await page.getByTestId("input-onboarding-name").press("Enter");
  await expect(dialog.getByRole("heading", { name: "Qual é a data prevista?" })).toBeVisible();

  // Sem data, "Entrar" explica em vez de salvar em silêncio.
  await page.getByTestId("button-onboarding-finish").click();
  await expect(page.getByText("Escolha a data prevista ou toque em “configurar depois”.")).toBeVisible();

  await page.getByTestId("input-onboarding-due-date").fill(isoDaysFromToday(100));
  await page.getByTestId("button-onboarding-finish").click();

  await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
  await expect(page.getByText("Olá, Bia")).toBeVisible();
  await expect(page.locator(".overview-week")).toHaveText(/semana \d+/i);
  await expect(page).toHaveTitle("Início · Ninho");
});

test("login mostra erro por campo sem travar senha curta", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByTestId("button-auth-submit").click();
  await expect(page.getByText("Digite seu e-mail para continuar.")).toBeVisible();
  await expect(page.getByText("Digite sua senha.")).toBeVisible();

  await page.getByTestId("input-auth-email").fill(uniqueEmail("login"));
  await page.getByTestId("input-auth-password").fill("curta");
  await page.getByTestId("button-auth-submit").click();
  // Quem recusa é o servidor, com a mensagem genérica.
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  await expectAccessible(page);
});

test("recuperação de senha limita o quarto pedido na mesma hora", async ({ page }) => {
  const email = uniqueEmail("reset");
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto("/forgot-password");
    await page.getByRole("textbox", { name: /e-mail/i }).fill(email);
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(page.getByText("Se houver uma conta, o link está a caminho.")).toBeVisible();
  }
  await page.goto("/forgot-password");
  await page.getByRole("textbox", { name: /e-mail/i }).fill(email);
  await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
  await expect(page.getByText("Muitos pedidos de redefinição de senha. Aguarde uma hora antes de tentar novamente.")).toBeVisible();
  await expectAccessible(page);

  // O contador vive no banco (vale entre processos) e sem o e-mail em claro.
  const keys = await withTestDb(async (db) => {
    const { rows } = await db.query<{ key: string }>("SELECT key FROM auth_attempts WHERE key LIKE 'password-reset:account:%'");
    return rows.map((row) => row.key);
  });
  expect(keys.length).toBeGreaterThan(0);
  expect(keys.some((key) => key.includes(email) || key.includes(email.split("@")[0]!))).toBe(false);
});
