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
  // Sem nome e telefone a reserva não é enviada.
  await dialog.getByTestId("button-confirm-gift-reservation").click();
  await expect(dialog.getByText("Informe seu nome (pelo menos 2 letras).")).toBeVisible();
  await expect(dialog.getByText("Informe seu WhatsApp com DDD.")).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("input-gift-guest-name").fill("Tia Rosa");
  await dialog.getByTestId("input-gift-guest-phone").fill("(11) 91234-5678");
  await dialog.getByTestId("button-confirm-gift-reservation").click();
  await expect(dialog).toBeHidden();
  await expect(guestPage.locator(".public-gift-item.is-reserved").first()).toContainText("Tia Rosa");
  await guest.close();
});

test("Enxoval: o convidado esconde o nome dos outros e só a dona vê nome e telefone", async ({ page, browser }) => {
  await createAccount(page, { displayName: "Carla" });
  const share = await page.request.post("/api/me/share", { data: {} });
  const { token } = (await share.json()) as { token: string };

  const guest = await browser.newContext({ viewport: page.viewportSize() ?? undefined, reducedMotion: "reduce" });
  const guestPage = await guest.newPage();
  await guestPage.goto(`/gift/${token}`);
  await guestPage.locator(".public-gift-item").first().getByRole("button", { name: "vou presentear" }).click();
  const dialog = guestPage.getByRole("dialog");
  await expect(dialog.getByText(/ficam só com Carla/)).toBeVisible();
  await expect(dialog.getByTestId("switch-gift-show-name")).toBeChecked();
  await expect(dialog.getByText("Os outros convidados veem o seu nome.")).toBeVisible();
  await dialog.getByTestId("input-gift-guest-name").fill("Tia Rosa");
  await expect(dialog.getByText("Os outros convidados veem “Tia Rosa”.")).toBeVisible();
  await dialog.getByTestId("input-gift-guest-phone").fill("11 91234-5678");
  await dialog.getByTestId("switch-gift-show-name").uncheck();
  await expect(dialog.getByText("Os outros convidados veem “já escolhido”.")).toBeVisible();
  await expectAccessible(guestPage);
  await dialog.getByTestId("button-confirm-gift-reservation").click();
  await expect(dialog).toBeHidden();

  // Para os outros convidados, o item só aparece como escolhido.
  const reserved = guestPage.locator(".public-gift-item.is-reserved").first();
  await expect(reserved).toContainText("Já escolhido");
  await expect(reserved).not.toContainText("Tia Rosa");
  const publicText = await (await page.request.get(`/api/gift/${token}`)).text();
  expect(publicText).not.toContain("Tia Rosa");
  expect(publicText).not.toContain("91234");
  expect(publicText).not.toContain("5511912345678");

  // A dona vê os dois e chama no WhatsApp.
  await page.goto("/checklist");
  const phone = page.locator("[data-testid^='reservation-phone-']").first();
  await expect(phone).toContainText("(11) 91234-5678");
  await expect(phone.getByRole("link", { name: "Chamar (11) 91234-5678 no WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511912345678");
  const workspace = await (await page.request.get("/api/me/workspace")).json() as { giftReservations: Array<{ guestName: string; guestPhone: string; showName: boolean }> };
  expect(workspace.giftReservations).toMatchObject([{ guestName: "Tia Rosa", guestPhone: "+5511912345678", showName: false }]);
  await guest.close();
});
