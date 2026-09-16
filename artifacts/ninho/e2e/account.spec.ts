import { expect, test, type BrowserContext } from "@playwright/test";
import { createAccount, expectAccessible, PASSWORD, randomClientIp } from "./support";

async function sessionCookieHeader(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((c) => c.name === "ninho_session");
  expect(cookie, "cookie de sessão").toBeTruthy();
  return `ninho_session=${cookie!.value}`;
}

test("sair deste aparelho revoga o token na hora", async ({ page, context, playwright, baseURL }) => {
  await createAccount(page);
  const stolenCookie = await sessionCookieHeader(context);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Sua conta" })).toBeVisible();
  await expectAccessible(page);
  await page.getByTestId("button-profile-sign-out").click();
  await expect(page).toHaveURL(/\/sign-in/);

  // Um token copiado antes de sair não vale mais.
  const outsider = await playwright.request.newContext({ baseURL });
  const reuse = await outsider.get("/api/me/workspace", { headers: { cookie: stolenCookie } });
  expect(reuse.status()).toBe(401);
  await outsider.dispose();
});

test("sair de todos os aparelhos derruba as outras sessões", async ({ page, browser, baseURL }) => {
  const { email } = await createAccount(page);

  // Um segundo aparelho entra na mesma conta.
  const other = await browser.newContext({ baseURL });
  const login = await other.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  expect(login.status()).toBe(200);
  expect((await other.request.get("/api/me/workspace")).status()).toBe(200);

  await page.goto("/profile");
  await page.getByTestId("button-profile-sign-out-everywhere").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Sair de todos os aparelhos?" })).toBeVisible();
  await expectAccessible(page);
  await dialog.getByTestId("button-confirm-action").click();
  await expect(page).toHaveURL(/\/sign-in/);

  expect((await other.request.get("/api/me/workspace")).status()).toBe(401);
  expect((await page.request.get("/api/me/workspace")).status()).toBe(401);
  await other.close();

  // A conta continua de pé: dá para entrar de novo.
  const again = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  expect(again.status()).toBe(200);
});
