import { randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { CONFIRM_SUBJECT, emailsTo, tokenFrom, waitForEmail } from "./mail";
import { createAccount, expectAccessible, PASSWORD, randomClientIp, uniqueEmail } from "./support";

const OTHER_PASSWORD = "OutraSenhaForte2026!";

function register(request: APIRequestContext, email: string, password = PASSWORD) {
  return request.post("/api/auth/register", { data: { email, password }, headers: { "x-forwarded-for": randomClientIp() } });
}

function login(request: APIRequestContext, email: string, password: string) {
  return request.post("/api/auth/login", { data: { email, password }, headers: { "x-forwarded-for": randomClientIp() } });
}

test("login antes de confirmar pede a confirmação, e o link reenviado abre o ninho", async ({ page }) => {
  const email = uniqueEmail("pendente");
  expect((await register(page.request, email)).status()).toBe(202);
  const firstCount = (await emailsTo(email)).length;

  await page.goto("/sign-in");
  await page.getByTestId("input-auth-email").fill(email);
  await page.getByTestId("input-auth-password").fill(PASSWORD);
  await page.getByTestId("button-auth-submit").click();
  await expect(page.getByText("Falta confirmar seu e-mail. Abra o link que enviamos ou peça outro.")).toBeVisible();
  await expectAccessible(page);

  await page.getByTestId("button-resend-verification").click();
  await expect(page.getByRole("status")).toHaveText("Se houver um cadastro esperando confirmação, enviamos um novo link.");
  const resent = await waitForEmail(email, CONFIRM_SUBJECT, firstCount);

  await page.goto(`/verify-email?token=${tokenFrom(resent)}`);
  await expect(page.getByTestId("input-onboarding-name")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("cadastro com e-mail já confirmado responde igual, não muda a senha e avisa por e-mail", async ({ page }) => {
  const { email } = await createAccount(page);
  const fresh = await register(page.request, uniqueEmail("novo"));
  const repeated = await register(page.request, email, OTHER_PASSWORD);

  expect(repeated.status()).toBe(fresh.status());
  expect(await repeated.json()).toEqual(await fresh.json());
  const warning = await waitForEmail(email, /Você já tem uma conta/);
  expect(warning.text).toContain("https://ninho.test/forgot-password");

  expect((await login(page.request, email, OTHER_PASSWORD)).status()).toBe(401);
  expect((await login(page.request, email, PASSWORD)).status()).toBe(200);
});

test("cadastro repetido antes de confirmar: vale a senha do link usado", async ({ page }) => {
  const email = uniqueEmail("repetido");
  await register(page.request, email, PASSWORD);
  const first = tokenFrom(await waitForEmail(email, CONFIRM_SUBJECT));
  await register(page.request, email, OTHER_PASSWORD);
  const second = tokenFrom(await waitForEmail(email, CONFIRM_SUBJECT, 1));

  expect((await page.request.post("/api/auth/verify-email", { data: { token: second } })).status()).toBe(200);
  expect((await login(page.request, email, PASSWORD)).status()).toBe(401);
  expect((await login(page.request, email, OTHER_PASSWORD)).status()).toBe(200);
  // O outro link morreu junto: não troca a senha de volta.
  expect((await page.request.post("/api/auth/verify-email", { data: { token: first } })).status()).toBe(400);
});

test("link inválido explica, sai da URL e deixa pedir outro", async ({ page }) => {
  await page.goto(`/verify-email?token=${randomBytes(32).toString("base64url")}`);
  await expect(page.getByRole("heading", { name: "Este link não vale mais" })).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/);
  await expectAccessible(page);

  await page.getByTestId("input-verify-email").fill(uniqueEmail("sem-conta"));
  await page.getByTestId("button-verify-resend").click();
  await expect(page.getByRole("status")).toHaveText("Se houver um cadastro esperando confirmação, enviamos um novo link.");
});

test("redefinir a senha pelo e-mail também confirma a conta", async ({ page }) => {
  const email = uniqueEmail("reset-confirma");
  await register(page.request, email);
  const verification = tokenFrom(await waitForEmail(email, CONFIRM_SUBJECT));

  const request = await page.request.post("/api/auth/password-reset/request", {
    data: { email },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  expect(request.status()).toBe(202);
  const resetToken = tokenFrom(await waitForEmail(email, /Redefina sua senha/), "/reset-password");
  const complete = await page.request.post("/api/auth/password-reset/complete", { data: { token: resetToken, password: OTHER_PASSWORD } });
  expect(complete.status()).toBe(200);

  expect((await login(page.request, email, OTHER_PASSWORD)).status()).toBe(200);
  expect((await page.request.post("/api/auth/verify-email", { data: { token: verification } })).status()).toBe(400);
});
