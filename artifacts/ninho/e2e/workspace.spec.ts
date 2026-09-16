import { expect, test } from "@playwright/test";
import { createAccount, expectAccessible, isoDaysFromToday, itemRow } from "./support";

test("cinco destinos, com o mesmo nome na navegação e no título", async ({ page }) => {
  await createAccount(page);
  const destinations = [
    { name: "Início", path: "/dashboard" },
    { name: "Lista", path: "/checklist" },
    { name: "Marcos", path: "/milestones" },
    { name: "Orçamento", path: "/budget" },
    { name: "Perfil", path: "/profile" },
  ];
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  for (const { name, path } of destinations) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page).toHaveTitle(`${name} · Ninho`);
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    await expectAccessible(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, `rolagem lateral em ${path}`).toBeLessThanOrEqual(clientWidth);
  }
});

test("marcos mostram atrasado com a data real", async ({ page }) => {
  await createAccount(page, { dueDate: isoDaysFromToday(100) });
  await page.goto("/milestones");
  const late = page.getByTestId("button-phone-milestone-20");
  await expect(late).toContainText("Semana 20 · atrasado");
  await late.click();
  await expect(late).toHaveAttribute("aria-pressed", "true");
  await expect(late).toContainText("concluído");
});

test("data prevista no passado trava em 40 e pergunta sobre a chegada", async ({ page }) => {
  await createAccount(page, { dueDate: isoDaysFromToday(-3) });
  await page.goto("/milestones");
  await expect(page.getByText("A chegada pode ser a qualquer momento.")).toBeVisible();
  await expect(page.locator(".gestation-card .card-title")).toHaveText(/semana 40/i);
  await page.goto("/dashboard");
  await expect(page.getByText("A data prevista chegou.")).toBeVisible();
});

test("perfil sempre editável, com salvar só quando muda algo", async ({ page }) => {
  await createAccount(page);
  await page.goto("/profile");
  await expect(page.getByTestId("button-save-profile")).toHaveCount(0);
  await page.getByTestId("input-phone-profile-city").fill("Recife");
  await page.getByTestId("button-save-profile").click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();
  await expect(page.getByTestId("button-save-profile")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("input-phone-profile-city")).toHaveValue("Recife");
});

test("sessão expirada leva ao login com aviso", async ({ page, context }) => {
  await createAccount(page);
  await page.goto("/checklist");
  await expect(itemRow(page, "Body manga curta")).toBeVisible();
  await context.clearCookies();
  await itemRow(page, "Body manga curta").getByRole("radio", { name: "comprei" }).click();
  await expect(page).toHaveURL(/\/sign-in\?expirou=1$/);
  await expect(page.getByText("Sua sessão expirou. Entre de novo para continuar de onde parou.")).toBeVisible();
});

test("página pública de presentes reserva um item sem conta", async ({ page, browser }) => {
  await createAccount(page, { displayName: "Carla" });
  const share = await page.request.post("/api/me/share", { data: {} });
  expect(share.status()).toBe(201);
  const { token } = (await share.json()) as { token: string };

  const guest = await browser.newContext({ viewport: page.viewportSize() ?? undefined, reducedMotion: "reduce" });
  const guestPage = await guest.newPage();
  await guestPage.goto(`/gift/${token}`);
  await expect(guestPage.getByRole("heading", { level: 1, name: "Lista de presentes de Carla" })).toBeVisible();
  await expectAccessible(guestPage);

  const item = guestPage.locator(".public-gift-item").first();
  await item.getByRole("button", { name: "vou presentear" }).click();
  const dialog = guestPage.getByRole("dialog");
  await dialog.getByTestId("input-gift-guest-name").fill("Tia Rosa");
  await dialog.getByTestId("button-confirm-gift-reservation").click();
  await expect(dialog).toBeHidden();
  await expect(guestPage.locator(".public-gift-item.is-reserved").first()).toContainText("Tia Rosa");
  await guest.close();
});
