import { expect, test, type Browser, type Page } from "@playwright/test";
import { createAccount, expectAccessible, isoDaysFromToday, randomClientIp } from "./support";

/** Cada convidado é outro navegador, sem sessão e com outra origem (o limite de reservas é por origem). */
async function openAsGuest(browser: Browser, baseURL: string | undefined, link: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": randomClientIp() } });
  const page = await context.newPage();
  await page.goto(new URL(link).pathname + new URL(link).hash);
  return page;
}

const guestItem = (page: Page, name: string) => page.locator(".guest-item", { has: page.getByRole("heading", { name, exact: true }) });
const ownerItem = (page: Page, name: string) => page.locator(".gift-item-row", { hasText: name });

async function createListFromTemplate(page: Page, template: string): Promise<string> {
  await page.goto("/gifts");
  await expect(page.getByRole("heading", { name: "Listas para presentear" })).toBeVisible();
  await page.getByTestId("button-create-first-list").click();
  await page.getByTestId(`button-template-${template}`).click();
  await page.getByTestId("button-confirm-create-list").click();
  await expect(page).toHaveURL(/\/gifts\/\d+$/);
  return (await page.getByTestId("text-gift-list-link").textContent())!;
}

test("chá de bebê: criar pelo modelo, cadastrar o Pix, dois convidados fecham o valor e a mãe confirma", async ({ page, browser, baseURL }) => {
  await createAccount(page, { displayName: "Ana" });
  await page.goto("/checklist");
  await page.getByRole("tab", { name: "Presentes" }).click();
  await expect(page).toHaveURL(/\/gifts$/);
  await expect(page).toHaveTitle("Presentes · Ninho");
  await expectAccessible(page);

  const link = await createListFromTemplate(page, "cha-de-bebe");
  await expect(page.getByRole("heading", { level: 2, name: "Chá de bebê" })).toBeVisible();
  await expect(page.getByText("Cadastre sua chave Pix para os convidados contribuírem com valor.")).toBeVisible();
  await expectAccessible(page);

  // Pix: salva e mostra o Pix de teste para conferir no banco.
  await page.getByTestId("button-open-pix").click();
  await page.getByTestId("input-pix-key").fill("529.982.247-25");
  await page.getByTestId("input-pix-name").fill("Ana Lima");
  await page.getByTestId("input-pix-city").fill("São Paulo");
  await page.getByTestId("button-save-pix").click();
  await expect(page.getByRole("heading", { name: "Confira no seu banco" })).toBeVisible();
  await expect(page.getByTestId("pix-payload")).toContainText("54040.01");
  await expectAccessible(page);
  await page.getByTestId("button-pix-done").click();
  await expect(page.getByText("***.982.247-**")).toBeVisible();

  // Dados do evento.
  await page.getByTestId("button-edit-list").click();
  await page.getByTestId("input-list-date").fill(isoDaysFromToday(12));
  await page.getByTestId("input-list-time").fill("15:00");
  await page.getByTestId("input-list-place").fill("Salão do prédio");
  await page.getByTestId("button-save-list").click();
  await expect(page.getByText("Faltam 12 dias")).toBeVisible();

  // Primeiro convidado: contribui com uma parte.
  const carla = await openAsGuest(browser, baseURL, link);
  await expect(carla.getByRole("heading", { level: 1, name: "Chá de bebê" })).toBeVisible();
  await expect(carla.getByText("Lista de Ana")).toBeVisible();
  await expect(carla.getByText("Salão do prédio")).toBeVisible();
  await expectAccessible(carla);
  await guestItem(carla, "Carrinho de bebê").getByRole("button", { name: "Participar" }).click();
  await expect(carla.getByRole("dialog").getByText(/faltam R\$\s1\.200/)).toBeVisible();
  await carla.getByTestId("button-guest-contribute").click();
  await carla.getByTestId("button-amount-10000").click();
  await carla.getByTestId("input-guest-name").fill("Tia Carla");
  await expectAccessible(carla);
  await carla.getByTestId("button-confirm-amount").click();
  await expect(carla.getByRole("heading", { name: /Pix de R\$\s100,00 para Ana/ })).toBeVisible();
  await expect(carla.getByTestId("pix-payload")).toContainText("5406100.00");
  await expect(carla.getByTestId("pix-qr")).toBeVisible();
  await expectAccessible(carla);
  await carla.getByTestId("button-pix-paid").click();
  await expect(carla.getByRole("heading", { name: "Reserva feita, Tia Carla." })).toBeVisible();
  await carla.getByTestId("button-guest-done").click();
  await expect(guestItem(carla, "Carrinho de bebê")).toContainText(/R\$\s100 de R\$\s1\.200 · faltam R\$\s1\.100/);
  await expect(carla.getByRole("heading", { name: "Suas reservas" })).toBeVisible();

  // Segundo convidado: "item inteiro" sumiu; completa o que falta e deixa o Pix para depois.
  const pedro = await openAsGuest(browser, baseURL, link);
  await guestItem(pedro, "Carrinho de bebê").getByRole("button", { name: "Participar" }).click();
  await expect(pedro.getByTestId("button-guest-whole")).toHaveCount(0);
  await pedro.getByTestId("button-guest-complete").click();
  await expect(pedro.getByTestId("button-amount-rest")).toHaveAttribute("aria-pressed", "true");
  await pedro.getByTestId("button-confirm-amount").click();
  await expect(pedro.getByTestId("pix-payload")).toContainText("54071100.00");
  await pedro.getByTestId("button-pix-later").click();
  await pedro.getByTestId("button-guest-done").click();
  await expect(guestItem(pedro, "Carrinho de bebê").getByText("Completo")).toBeVisible();
  // Ninguém vê quanto o outro deu.
  await expect(pedro.getByText("Tia Carla")).toHaveCount(0);

  // A mãe vê quem deu, o que cada um declarou, e confirma.
  await page.reload();
  const carrinho = ownerItem(page, "Carrinho de bebê");
  await carrinho.getByRole("button", { name: "2 pessoas" }).click();
  const dialog = page.getByRole("dialog", { name: "Carrinho de bebê" });
  await expect(dialog.getByText(/disse que já fez o Pix/)).toBeVisible();
  await expect(dialog.getByText(/vai fazer o Pix/)).toBeVisible();
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Recebi" }).first().click();
  await expect(dialog.getByText("recebido", { exact: true })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Recebi" }).click();
  await expect(dialog.getByText("recebido", { exact: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(carrinho.getByText("completo")).toBeVisible();

  await carla.context().close();
  await pedro.context().close();
});

test("presente inteiro com o nome à mostra, pacotes divididos e cancelamento pelo convidado", async ({ page, browser, baseURL }) => {
  await createAccount(page, { displayName: "Ana" });
  const link = await createListFromTemplate(page, "cha-de-bebe");

  const guest = await openAsGuest(browser, baseURL, link);
  await guestItem(guest, "Kit de mamadeiras").getByRole("button", { name: "Quero dar" }).click();
  await expect(guest.getByTestId("switch-show-name")).toBeDisabled();
  await guest.getByTestId("input-guest-name").fill("Marina");
  await expect(guest.getByTestId("switch-show-name")).toBeChecked();
  await expectAccessible(guest);
  await guest.getByTestId("button-confirm-whole").click();
  await expect(guest.getByRole("heading", { name: "Reserva feita, Marina." })).toBeVisible();
  await guest.getByTestId("button-guest-done").click();
  await expect(guestItem(guest, "Kit de mamadeiras").getByText("Presente de Marina")).toBeVisible();

  await guestItem(guest, "Fralda P").getByRole("button", { name: "Quero dar" }).click();
  await guest.getByTestId("button-units-plus").click();
  await guest.getByTestId("button-units-plus").click();
  await expect(guest.getByTestId("text-units")).toHaveText("3");
  await expectAccessible(guest);
  await guest.getByTestId("button-confirm-units").click();
  await guest.getByTestId("button-guest-done").click();
  await expect(guestItem(guest, "Fralda P")).toContainText("3 de 10 pacotes · faltam 7");

  // O aparelho lembra das reservas; cancelar devolve o saldo.
  await guest.reload();
  const mine = guest.locator(".guest-mine");
  await expect(mine.getByText("Fralda P")).toBeVisible();
  await mine.locator(".pledge-row", { hasText: "Fralda P" }).getByRole("button", { name: "cancelar" }).click();
  await expect(guestItem(guest, "Fralda P")).toContainText("0 de 10 pacotes · faltam 10");
  await expect(mine.getByText("Fralda P")).toHaveCount(0);
  await guest.context().close();

  // Outro convidado vê "Presente de Marina" e não consegue pegar o mesmo item.
  const other = await openAsGuest(browser, baseURL, link);
  await expect(guestItem(other, "Kit de mamadeiras").getByRole("button")).toHaveCount(0);
  await other.context().close();
});

test("link particular abre as reservas em outro aparelho e sai da barra de endereço", async ({ page, browser, baseURL }) => {
  await createAccount(page);
  const link = await createListFromTemplate(page, "cha-de-fralda");
  const token = link.split("/lista/")[1]!;
  const list = await (await page.request.get(`/api/lists/${token}`)).json() as { items: { id: number; name: string }[] };
  const pledge = await page.request.post(`/api/lists/${token}/pledges`, {
    data: { itemId: list.items.find((item) => item.name === "Fralda M")!.id, kind: "units", units: 2, guestName: "Juliana" },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  const { manageToken } = await pledge.json() as { manageToken: string };

  const guest = await openAsGuest(browser, baseURL, `${link}#p=${manageToken}`);
  await expect(guest.locator(".guest-mine").getByText("Fralda M")).toBeVisible();
  await expect(guest).toHaveURL(new RegExp(`/lista/${token}$`));
  await guest.context().close();
});

test("a mãe adiciona presente com link, marca “já tenho” e exclui a lista", async ({ page, browser, baseURL }) => {
  await createAccount(page);
  const link = await createListFromTemplate(page, "em-branco");
  await expect(page.getByText("Nenhum presente nesta lista ainda.")).toBeVisible();

  await page.getByTestId("button-add-first-gift-item").click();
  await page.getByTestId("input-gift-item-name").fill("Babá eletrônica");
  await page.getByTestId("input-gift-store-url").fill("http://loja.exemplo.com/baba");
  await page.getByTestId("button-save-gift-item").click();
  await expect(page.getByText("Use um link que comece com https://")).toBeVisible();
  await page.getByTestId("input-gift-store-url").fill("https://www.loja.exemplo.com/baba");
  await page.getByTestId("input-gift-note").fill("com câmera");
  await expectAccessible(page);
  await page.getByTestId("button-save-gift-item").click();
  await expect(ownerItem(page, "Babá eletrônica")).toBeVisible();

  const guest = await openAsGuest(browser, baseURL, link);
  const item = guestItem(guest, "Babá eletrônica");
  await expect(item.getByText("com câmera")).toBeVisible();
  await expect(item.getByRole("link", { name: /ver na loja/ })).toHaveAttribute("href", "https://www.loja.exemplo.com/baba");
  await expect(item.getByRole("link", { name: /ver na loja/ })).toHaveAttribute("rel", "noopener noreferrer");
  await expect(item).toContainText("loja.exemplo.com");

  // "Já tenho" tira da lista do convidado.
  await ownerItem(page, "Babá eletrônica").locator(".gift-item-main").click();
  await page.getByTestId("switch-gift-hidden").check();
  await page.getByTestId("button-save-gift-item").click();
  await expect(ownerItem(page, "Babá eletrônica").getByText("já tenho")).toBeVisible();
  await guest.reload();
  await expect(guest.getByText("Esta lista ainda não tem presentes.")).toBeVisible();

  // Excluir a lista derruba o link.
  await page.getByTestId("button-edit-list").click();
  await page.getByTestId("button-delete-list").click();
  await page.getByTestId("button-confirm-action").click();
  await expect(page).toHaveURL(/\/gifts$/);
  await expect(page.getByText("Você ainda não tem uma lista de presentes.")).toBeVisible();
  await guest.reload();
  await expect(guest.getByRole("heading", { name: "Esta lista não está mais disponível." })).toBeVisible();
  await guest.context().close();
});
