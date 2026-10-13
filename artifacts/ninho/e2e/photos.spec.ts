import { expect, test, type Locator, type Page } from "@playwright/test";
import { withTestDb } from "./db";
import { createAccount, expectAccessible, itemRow, openAsGuest, PASSWORD } from "./support";

// Dois PNGs válidos de 1×1, diferentes entre si: o servidor abre, trata e regrava cada um.
const PNG_A = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PNG_B = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const png = (name: string, buffer = PNG_A) => ({ name, mimeType: "image/png", buffer });

type Item = { id: number; name: string; photoKey: string | null };

async function items(page: Page): Promise<Item[]> {
  const response = await page.request.get("/api/me/workspace");
  return ((await response.json()) as { items: Item[] }).items;
}

async function uploadTo(page: Page, itemId: number, buffer = PNG_A): Promise<string> {
  const response = await page.request.put(`/api/me/checklist/${itemId}/photo`, { data: buffer, headers: { "content-type": "image/png" } });
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as Item).photoKey!;
}

const photoOf = (row: Locator, name: string) => row.getByRole("img", { name: `Foto de ${name}` });
const mediaStatus = async (page: Page, key: string) => (await page.request.get(`/api/media/${key}`)).status();

test.describe("Enxoval", () => {
  test("adicionar item com foto, trocar e remover", async ({ page }) => {
    await createAccount(page);
    await page.goto("/checklist");
    await page.getByTestId("button-phone-add-list-item").click();
    const add = page.getByRole("dialog", { name: "Adicionar item" });
    await add.getByTestId("input-new-item").fill("Manta de tricô");
    await expect(add.getByTestId("photo-preview")).toHaveCount(0);
    await add.getByTestId("input-photo").setInputFiles(png("manta.png"));
    // A prévia aparece na hora, antes de salvar (FP-R4).
    await expect(add.getByTestId("photo-preview")).toBeVisible();
    await expect(add.getByTestId("photo-preview")).toHaveAttribute("alt", "Foto de Manta de tricô");
    await expectAccessible(page);
    await add.getByTestId("button-confirm-add-item").click();
    await expect(add).toBeHidden();

    const row = itemRow(page, "Manta de tricô");
    const photo = photoOf(row, "Manta de tricô");
    await expect(photo).toBeVisible();
    const firstSrc = (await photo.getAttribute("src"))!;
    expect(firstSrc).toMatch(/^\/api\/media\/[a-f0-9]{32}$/);
    // A foto sai regravada em WebP e com cache longo: o nome muda quando a foto muda (FP-R2, R10).
    const served = await page.request.get(firstSrc);
    expect(served.status()).toBe(200);
    expect(served.headers()["content-type"]).toBe("image/webp");
    expect(served.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(served.headers()["x-content-type-options"]).toBe("nosniff");
    expect((await served.body()).subarray(0, 4).toString("latin1")).toBe("RIFF");
    await expectAccessible(page);

    await page.reload();
    await expect(photoOf(itemRow(page, "Manta de tricô"), "Manta de tricô")).toHaveAttribute("src", firstSrc);
    // Item sem foto continua como antes, sem quadrado vazio (decisão 6 da spec).
    await expect(itemRow(page, "Cueiro leve").getByRole("img")).toHaveCount(0);

    // Trocar: endereço novo, e o antigo deixa de responder (FP-R12).
    await itemRow(page, "Manta de tricô").locator(".check-item").click();
    const edit = page.getByRole("dialog", { name: "Manta de tricô" });
    await expect(edit.getByTestId("photo-preview")).toHaveAttribute("src", firstSrc);
    await edit.getByTestId("input-photo").setInputFiles(png("outra.png", PNG_B));
    await edit.getByTestId("button-confirm-edit-item").click();
    await expect(edit).toBeHidden();
    await expect(photoOf(itemRow(page, "Manta de tricô"), "Manta de tricô")).not.toHaveAttribute("src", firstSrc);
    const secondSrc = (await photoOf(itemRow(page, "Manta de tricô"), "Manta de tricô").getAttribute("src"))!;
    expect((await page.request.get(firstSrc)).status()).toBe(404);
    expect((await page.request.get(secondSrc)).status()).toBe(200);

    // Remover.
    await itemRow(page, "Manta de tricô").locator(".check-item").click();
    await edit.getByTestId("button-remove-photo").click();
    await expect(edit.getByTestId("photo-preview")).toHaveCount(0);
    await edit.getByTestId("button-confirm-edit-item").click();
    await expect(edit).toBeHidden();
    await expect(itemRow(page, "Manta de tricô").getByRole("img")).toHaveCount(0);
    expect((await page.request.get(secondSrc)).status()).toBe(404);
  });

  test("desfazer a remoção devolve o item com a foto; a foto de item apagado some na limpeza", async ({ page }) => {
    const { email } = await createAccount(page);
    const all = await items(page);
    const cueiro = all.find((item) => item.name === "Cueiro leve")!;
    const body = all.find((item) => item.name === "Body manga curta")!;
    const cueiroKey = await uploadTo(page, cueiro.id);
    const bodyKey = await uploadTo(page, body.id, PNG_B);

    await page.goto("/checklist");
    await expect(photoOf(itemRow(page, "Cueiro leve"), "Cueiro leve")).toBeVisible();
    await page.getByRole("button", { name: "Remover Cueiro leve" }).click();
    await expect(itemRow(page, "Cueiro leve")).toHaveCount(0);
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(photoOf(itemRow(page, "Cueiro leve"), "Cueiro leve")).toHaveAttribute("src", `/api/media/${cueiroKey}`);
    expect(await mediaStatus(page, cueiroKey)).toBe(200);

    // Sem desfazer: a foto fica solta e sai na limpeza seguinte, depois da janela de dez minutos (FP-R13).
    expect((await page.request.delete(`/api/me/checklist/${body.id}`)).status()).toBe(204);
    expect(await mediaStatus(page, bodyKey)).toBe(200);
    await withTestDb((db) => db.query(
      "UPDATE media_files SET created_at = now() - interval '1 hour' WHERE user_id = (SELECT id FROM auth_users WHERE email = $1)",
      [email],
    ));
    // Um envio novo da mesma conta roda a limpeza dela antes de conferir o limite.
    const macacao = all.find((item) => item.name === "Macacão de algodão")!;
    await uploadTo(page, macacao.id);
    expect(await mediaStatus(page, bodyKey)).toBe(404);
    // A foto que ainda tem item continua, por mais antiga que seja.
    expect(await mediaStatus(page, cueiroKey)).toBe(200);
  });

  test("arquivo que não é foto, grande demais ou de outra conta é recusado", async ({ page, browser }) => {
    await createAccount(page);
    const mine = (await items(page))[0]!;

    // No aparelho, antes de enviar (FP-R3).
    await page.goto("/checklist");
    await page.getByTestId("button-phone-add-list-item").click();
    const add = page.getByRole("dialog", { name: "Adicionar item" });
    await add.getByTestId("input-photo").setInputFiles({ name: "nota.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await expect(add.getByTestId("photo-error")).toHaveText(/Escolha uma foto em JPEG, PNG ou WebP\./);
    await add.getByTestId("input-photo").setInputFiles({ name: "enorme.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
    await expect(add.getByTestId("photo-error")).toHaveText(/A foto passa de 8 MB\. Escolha uma menor\./);
    await expect(add.getByTestId("photo-preview")).toHaveCount(0);
    await page.keyboard.press("Escape");

    // No servidor, sempre: um PDF com nome e tipo de foto não passa.
    const url = `/api/me/checklist/${mine.id}/photo`;
    const fake = await page.request.put(url, { data: Buffer.from("%PDF-1.7\n1 0 obj\n<< >>\nendobj\n"), headers: { "content-type": "image/jpeg" } });
    expect(fake.status()).toBe(400);
    expect(await fake.json()).toEqual({ error: "Não conseguimos abrir esta foto. Tente outra imagem em JPEG, PNG ou WebP." });
    const tooBig = await page.request.put(url, { data: Buffer.alloc(8 * 1024 * 1024 + 1), headers: { "content-type": "image/jpeg" } });
    expect(tooBig.status()).toBe(413);
    expect(await tooBig.json()).toEqual({ error: "A foto passa de 8 MB. Escolha uma menor." });
    // Só corpo de imagem: JSON e formulário não são foto (FP-R19).
    const json = await page.request.put(url, { data: { photo: "data:image/png;base64,AAAA" } });
    expect(json.status()).toBe(415);
    const form = await page.request.put(url, { multipart: { photo: { name: "a.png", mimeType: "image/png", buffer: PNG_A } } });
    expect(form.status()).toBe(415);
    expect((await items(page)).find((item) => item.id === mine.id)!.photoKey).toBeNull();

    // Item de outra conta não existe; sem sessão, nada feito (FP-R17).
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await createAccount(otherPage);
    const theirs = (await items(otherPage))[0]!;
    const theirKey = await uploadTo(otherPage, theirs.id);
    expect((await page.request.put(`/api/me/checklist/${theirs.id}/photo`, { data: PNG_A, headers: { "content-type": "image/png" } })).status()).toBe(404);
    expect((await page.request.delete(`/api/me/checklist/${theirs.id}/photo`)).status()).toBe(404);
    expect(await mediaStatus(otherPage, theirKey)).toBe(200);
    // O "desfazer" não serve para pegar a foto de outra conta: o item nasce sem foto.
    const { categories } = (await (await page.request.get("/api/me/workspace")).json()) as { categories: Array<{ id: number }> };
    const hijack = await page.request.post("/api/me/checklist", { data: { name: "Esperto", categoryId: categories[0]!.id, photoKey: theirKey } });
    expect(hijack.status()).toBe(201);
    expect(((await hijack.json()) as Item).photoKey).toBeNull();
    await otherContext.close();
    const anonymous = await browser.newContext();
    expect((await anonymous.request.put(new URL(url, page.url()).toString(), { data: PNG_A, headers: { "content-type": "image/png" } })).status()).toBe(401);
    await anonymous.close();

    // A rota das fotos só entende a chave no formato certo (FP-R18).
    for (const key of ["0123456789abcdef0123456789abcdef", "..%2F..%2Fpackage.json", "abc", `${theirKey}.webp`, theirKey.toUpperCase()]) {
      expect(await mediaStatus(page, key), key).toBe(404);
    }
  });

  test("exportação lista as fotos; excluir a conta apaga os arquivos", async ({ page }) => {
    await createAccount(page);
    const first = (await items(page))[0]!;
    const key = await uploadTo(page, first.id);

    const exported = (await (await page.request.get("/api/me/export")).json()) as {
      items: Item[];
      photos: Array<{ key: string; bytes: number; width: number; height: number; url: string }>;
    };
    expect(exported.items.find((item) => item.id === first.id)!.photoKey).toBe(key);
    expect(exported.photos).toHaveLength(1);
    expect(exported.photos[0]).toMatchObject({ key, width: 1, height: 1 });
    expect(exported.photos[0]!.url).toMatch(new RegExp(`/api/media/${key}$`));
    expect(exported.photos[0]!.bytes).toBeGreaterThan(0);

    const deleted = await page.request.delete("/api/me/account", { data: { password: PASSWORD, confirmation: "EXCLUIR" } });
    expect(deleted.status()).toBe(204);
    expect(await mediaStatus(page, key)).toBe(404);
  });
});

test.describe("Presentes", () => {
  test("presente com foto aparece para a mãe e para o convidado", async ({ page, browser, baseURL }) => {
    await createAccount(page);
    await page.goto("/gifts");
    await page.getByTestId("button-create-first-list").click();
    await page.getByTestId("button-template-em-branco").click();
    await page.getByTestId("button-confirm-create-list").click();
    await expect(page).toHaveURL(/\/gifts\/\d+$/);
    const link = (await page.getByTestId("text-gift-list-link").textContent())!;

    await page.getByTestId("button-add-first-gift-item").click();
    const dialog = page.getByRole("dialog", { name: "Adicionar presente" });
    await dialog.getByTestId("input-gift-item-name").fill("Banheira");
    await dialog.getByTestId("input-photo").setInputFiles(png("banheira.png"));
    await expect(dialog.getByTestId("photo-preview")).toBeVisible();
    await expectAccessible(page);
    await dialog.getByTestId("button-save-gift-item").click();
    await expect(dialog).toBeHidden();

    const row = page.locator(".gift-item-row", { hasText: "Banheira" });
    await expect(photoOf(row, "Banheira")).toBeVisible();
    const src = (await photoOf(row, "Banheira").getAttribute("src"))!;
    await expectAccessible(page);

    // Convidado, sem conta: foto no cartão e maior no diálogo (FP-R6).
    const guest = await openAsGuest(browser, baseURL, link);
    const card = guest.locator(".guest-item", { has: guest.getByRole("heading", { name: "Banheira", exact: true }) });
    await expect(photoOf(card, "Banheira")).toHaveAttribute("src", src);
    expect((await guest.request.get(src)).status()).toBe(200);
    await expectAccessible(guest);
    await card.getByRole("button").first().click();
    const guestDialog = guest.getByRole("dialog");
    await expect(photoOf(guestDialog, "Banheira")).toBeVisible();
    await expectAccessible(guest);
    await guest.context().close();

    // A mãe troca a foto pelo diálogo de edição, e remove.
    await row.getByRole("button", { name: /Banheira/ }).first().click();
    const edit = page.getByRole("dialog", { name: "Editar presente" });
    await edit.getByTestId("input-photo").setInputFiles(png("nova.png", PNG_B));
    await edit.getByTestId("button-save-gift-item").click();
    await expect(edit).toBeHidden();
    await expect(photoOf(row, "Banheira")).not.toHaveAttribute("src", src);
    expect((await page.request.get(src)).status()).toBe(404);

    await row.getByRole("button", { name: /Banheira/ }).first().click();
    await edit.getByTestId("button-remove-photo").click();
    await edit.getByTestId("button-save-gift-item").click();
    await expect(edit).toBeHidden();
    await expect(row.getByRole("img")).toHaveCount(0);
  });

  test("a página pública do Perfil mostra a foto do item do enxoval", async ({ page, browser, baseURL }) => {
    await createAccount(page);
    const body = (await items(page)).find((item) => item.name === "Body manga curta")!;
    const key = await uploadTo(page, body.id);
    const { token } = (await (await page.request.post("/api/me/share", { data: {} })).json()) as { token: string };

    const guest = await openAsGuest(browser, baseURL, `http://localhost/gift/${token}`);
    const card = guest.locator(".public-gift-item", { hasText: "Body manga curta" });
    await expect(photoOf(card, "Body manga curta")).toHaveAttribute("src", `/api/media/${key}`);
    // Sem foto, o ícone da categoria continua.
    await expect(guest.locator(".public-gift-item", { hasText: "Cueiro leve" }).getByRole("img")).toHaveCount(0);
    await expectAccessible(guest);
    await guest.context().close();
  });
});
