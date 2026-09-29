import { expect, test } from "@playwright/test";
import { createAccount, expectAccessible, itemRow } from "./support";

test.beforeEach(async ({ page }) => {
  await createAccount(page);
  await page.goto("/checklist");
  await expect(page.getByRole("heading", { level: 1, name: "Lista" })).toBeVisible();
});

test("status muda direto, sem ciclo escondido", async ({ page }) => {
  const row = itemRow(page, "Body manga curta");
  const bought = row.getByRole("radio", { name: "comprei" });
  const toBuy = row.getByRole("radio", { name: "a comprar" });

  await bought.click();
  await expect(bought).toHaveAttribute("aria-checked", "true");
  await toBuy.click();
  await expect(toBuy).toHaveAttribute("aria-checked", "true");
  await expect(row.getByRole("radio", { name: "ganhei" })).toHaveAttribute("aria-checked", "false");
});

test("marcar um item faz só o PATCH, sem recarregar o workspace", async ({ page }) => {
  const workspaceReads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/me/workspace")) workspaceReads.push(request.url());
  });
  const patch = page.waitForResponse((response) =>
    response.url().includes("/api/me/checklist/") && response.request().method() === "PATCH");

  await itemRow(page, "Cueiro leve").getByRole("radio", { name: "comprei" }).click();
  expect((await patch).ok()).toBe(true);
  await page.waitForLoadState("networkidle");
  expect(workspaceReads).toEqual([]);
  await expect(itemRow(page, "Cueiro leve").getByRole("radio", { name: "comprei" })).toHaveAttribute("aria-checked", "true");
});

test("adicionar item com quantidade e preço digitados tecla a tecla", async ({ page }) => {
  await page.getByTestId("button-phone-add-list-item").click();
  const dialog = page.getByRole("dialog", { name: "Adicionar item" });
  await expect(dialog).toBeVisible();
  await expectAccessible(page);

  await dialog.getByTestId("input-new-item").fill("Manta de teste");
  await dialog.getByTestId("input-item-qty").fill("2");
  // Digitação real, caractere por caractere (o campo não pode reformatar no meio).
  await dialog.getByTestId("input-item-price").pressSequentially("45,90");
  await dialog.getByTestId("input-new-item").press("Enter");

  await expect(dialog).toBeHidden();
  await expect(itemRow(page, "Manta de teste")).toContainText(/2 un\. × R\$\s45,90 · R\$\s91,80/);
});

test("editar preço e quantidade de um item existente", async ({ page }) => {
  await itemRow(page, "Cueiro leve").locator(".check-item").click();
  const dialog = page.getByRole("dialog", { name: "Cueiro leve" });
  await expect(dialog).toBeVisible();

  await dialog.getByTestId("input-item-qty").fill("4");
  await dialog.getByTestId("input-item-price").fill("");
  await dialog.getByTestId("input-item-price").pressSequentially("39,5");
  await dialog.getByTestId("button-confirm-edit-item").click();

  await expect(dialog).toBeHidden();
  await expect(itemRow(page, "Cueiro leve")).toContainText(/4 un\. × R\$\s39,50 · R\$\s158,00/);
});

test("remover mostra desfazer e o desfazer devolve o item", async ({ page }) => {
  await page.getByRole("button", { name: "Remover Cueiro leve" }).click();
  await expect(page.getByText("“Cueiro leve” saiu da lista.")).toBeVisible();
  await expect(itemRow(page, "Cueiro leve")).toHaveCount(0);

  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(itemRow(page, "Cueiro leve")).toBeVisible();
  await expect(itemRow(page, "Cueiro leve")).toContainText(/3 un\. × R\$\s42,00/);
});

test("Esc fecha o diálogo e devolve o foco ao botão de origem", async ({ page }) => {
  const trigger = page.getByTestId("button-phone-add-item");
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByRole("dialog", { name: /Adicionar item/ })).toBeVisible();
  await expect(page.getByTestId("input-new-item")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("orçamento soma só o que foi comprado, preço × quantidade", async ({ page }) => {
  await itemRow(page, "Macacão de algodão").getByRole("radio", { name: "comprei" }).click();
  await itemRow(page, "Body manga curta").getByRole("radio", { name: "ganhei" }).click();
  await expect(itemRow(page, "Body manga curta").getByRole("radio", { name: "ganhei" })).toHaveAttribute("aria-checked", "true");

  await page.goto("/budget");
  await expect(page.locator(".budget-total strong")).toHaveText(/R\$\s370,00/);
  await expectAccessible(page);
});

test("aba Inspirações dentro da Lista", async ({ page }) => {
  await page.getByRole("tab", { name: "Inspirações" }).click();
  await expect(page).toHaveURL(/\/recommendations$/);
  await expect(page.getByRole("heading", { name: "Ideias para o que falta" })).toBeVisible();
  await expect(page.locator(".recommendation-card").first()).toBeVisible();
  await expectAccessible(page);
});

test("busca acha item de outra categoria, sem acento, e o status funciona no resultado", async ({ page }) => {
  await page.getByTestId("button-phone-category-higiene").click();
  const search = page.getByRole("searchbox", { name: "Buscar item" });
  await search.fill("macacao");

  await expect(page.getByRole("heading", { name: "Resultados para “macacao”" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("1 item encontrado");
  await expect(page.getByRole("heading", { level: 3, name: "Roupas" })).toBeVisible();
  const row = itemRow(page, "Macacão de algodão");
  await row.getByRole("radio", { name: "comprei" }).click();
  await expect(row.getByRole("radio", { name: "comprei" })).toHaveAttribute("aria-checked", "true");
  await expectAccessible(page);
});

test("busca sem resultado oferece limpar e volta para a categoria", async ({ page }) => {
  const search = page.getByRole("searchbox", { name: "Buscar item" });
  await search.fill("carrinho");
  await expect(page.getByText("Nenhum item com “carrinho”.")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("0 itens encontrados");

  await page.getByTestId("button-empty-clear-checklist-search").click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.getByRole("heading", { level: 2, name: "Roupas" })).toBeVisible();
});

test("Esc, o botão de limpar e os chips limpam a busca", async ({ page }) => {
  const search = page.getByRole("searchbox", { name: "Buscar item" });
  await search.fill("body");
  await search.press("Escape");
  await expect(search).toHaveValue("");

  await search.fill("body");
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(search).toHaveValue("");

  await search.fill("body");
  await page.getByTestId("button-phone-category-higiene").click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("heading", { level: 2, name: "Higiene" })).toBeVisible();
});
