import { expect, test, type BrowserContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { withTestDb } from "./db";
import { createAccount, expectAccessible, PASSWORD, randomClientIp } from "./support";

const USER_TABLES = [
  "profiles",
  "checklist_items",
  "milestones",
  "budget_categories",
  "gift_share_links",
  "gift_reservations",
  "password_reset_tokens",
  "auth_sessions",
] as const;

async function rowsOwnedBy(email: string): Promise<Record<string, number>> {
  return withTestDb(async (db) => {
    const { rows } = await db.query<{ id: string }>("SELECT id FROM auth_users WHERE email = $1", [email]);
    const counts: Record<string, number> = { auth_users: rows.length };
    const userId = rows[0]?.id;
    for (const table of USER_TABLES) {
      if (!userId) {
        counts[table] = 0;
        continue;
      }
      const result = await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE user_id = $1`, [userId]);
      counts[table] = Number(result.rows[0]!.n);
    }
    return counts;
  });
}

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

test("exportar meus dados baixa um JSON com a lista e sem o token do link", async ({ page }) => {
  const { email } = await createAccount(page, { displayName: "Lia" });
  const share = await page.request.post("/api/me/share", { data: {} });
  const { token } = (await share.json()) as { token: string };

  await page.goto("/profile");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("link-export-data").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ninho-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);

  const text = await readFile((await download.path())!, "utf8");
  const data = JSON.parse(text) as {
    account: { email: string };
    profile: { displayName: string };
    items: Array<{ name: string }>;
    milestones: unknown[];
    budget: unknown[];
    giftShareLinks: Array<{ active: boolean }>;
  };
  expect(data.account.email).toBe(email);
  expect(data.profile.displayName).toBe("Lia");
  expect(data.items.map((item) => item.name)).toContain("Body manga curta");
  expect(data.milestones.length).toBeGreaterThan(0);
  expect(data.budget).toHaveLength(4);
  expect(data.giftShareLinks).toEqual([expect.objectContaining({ active: true })]);
  expect(text).not.toContain(token);
  expect(text).not.toContain("user_id");
  expect(text).not.toContain("passwordHash");
});

test("excluir a conta pede senha e EXCLUIR e apaga tudo", async ({ page }) => {
  const { email } = await createAccount(page);
  await page.request.post("/api/me/share", { data: {} });
  const before = await rowsOwnedBy(email);
  expect(before.auth_users).toBe(1);
  expect(before.checklist_items).toBeGreaterThan(0);
  expect(before.gift_share_links).toBe(1);

  await page.goto("/profile");
  await page.getByTestId("button-profile-delete-account").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Excluir sua conta?" })).toBeVisible();
  await expectAccessible(page);

  const confirm = dialog.getByTestId("button-confirm-delete-account");
  await dialog.getByTestId("input-delete-account-password").fill("senha-errada");
  await expect(confirm).toBeDisabled();
  await dialog.getByTestId("input-delete-account-confirmation").fill("excluir");
  await expect(confirm).toBeEnabled();

  // Senha errada: erro no campo, nada apagado.
  await confirm.click();
  await expect(dialog.getByText("Senha incorreta.")).toBeVisible();
  await expect(dialog.getByTestId("input-delete-account-password")).toHaveAttribute("aria-invalid", "true");
  expect(await rowsOwnedBy(email)).toEqual(before);

  await dialog.getByTestId("input-delete-account-password").fill(PASSWORD);
  await confirm.click();
  await expect(page).toHaveURL(/\/sign-in\?conta-excluida=1$/);
  await expect(page.getByText("Sua conta e todos os seus dados foram excluídos.")).toBeVisible();

  const after = await rowsOwnedBy(email);
  expect(Object.values(after).every((count) => count === 0), JSON.stringify(after)).toBe(true);

  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  expect(login.status()).toBe(401);
});

test("a API recusa excluir sem a palavra de confirmação", async ({ page }) => {
  const { email } = await createAccount(page);
  const response = await page.request.delete("/api/me/account", { data: { password: PASSWORD, confirmation: "sim" } });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: "Digite EXCLUIR para confirmar.", field: "confirmation" });
  expect((await rowsOwnedBy(email)).auth_users).toBe(1);
});
