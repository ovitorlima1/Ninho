import { expect, test, type Page } from "@playwright/test";
import { withTestDb } from "./db";
import { createAccount, expectAccessible, itemRow } from "./support";

type Category = { id: number; listId: number; name: string; icon: string; tone: string; planned: string };
type Item = { id: number; listId: number; categoryId: number; name: string; category: string; suggested: boolean; status: string };
type Workspace = { lists: Array<{ id: number; name: string; suggestionsNoticeDismissed: boolean }>; categories: Category[]; items: Item[] };

async function workspace(page: Page): Promise<Workspace> {
  const response = await page.request.get("/api/me/workspace");
  expect(response.ok()).toBe(true);
  return (await response.json()) as Workspace;
}

async function openList(page: Page): Promise<void> {
  await page.goto("/checklist");
  await expect(page.getByTestId("text-list-name")).toBeVisible();
}

// ─── E1 · Sugestões ──────────────────────────────────────────────────────────

test("conta nova mostra o aviso e as etiquetas; mexer no item tira a etiqueta e entendi fecha o aviso de vez", async ({ page }) => {
  await createAccount(page);
  await openList(page);

  const notice = page.getByTestId("suggestions-notice");
  await expect(notice).toContainText("Começamos com sugestões do Ninho.");
  await expect(notice).toContainText("Quantidades e preços são estimativas.");
  await expect(itemRow(page, "Body manga curta")).toContainText("Sugestão");
  await expect(itemRow(page, "Cueiro leve")).toContainText("Sugestão");
  await expectAccessible(page);

  // Marcar o item é adotar: ele deixa de ser sugestão (LC-R4).
  await itemRow(page, "Body manga curta").getByRole("radio", { name: "comprei" }).click();
  await expect(itemRow(page, "Body manga curta")).not.toContainText("Sugestão");

  // Item que a mãe adiciona nunca é sugestão (LC-R5).
  await page.getByTestId("button-phone-add-list-item").click();
  const dialog = page.getByRole("dialog", { name: "Adicionar item" });
  await dialog.getByTestId("input-new-item").fill("Manta de teste");
  await dialog.getByTestId("input-new-item").press("Enter");
  await expect(dialog).toBeHidden();
  await expect(itemRow(page, "Manta de teste")).not.toContainText("Sugestão");

  await page.getByTestId("button-dismiss-suggestions").click();
  await expect(notice).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("text-list-name")).toHaveText("Enxoval do bebê");
  await expect(page.getByTestId("suggestions-notice")).toHaveCount(0);
  await expect(itemRow(page, "Body manga curta")).not.toContainText("Sugestão");
  await expect(itemRow(page, "Cueiro leve")).toContainText("Sugestão");
});

test("o aviso some sozinho quando a última sugestão é mexida, e a busca mostra a etiqueta", async ({ page }) => {
  await createAccount(page);
  const before = await workspace(page);
  // Deixa uma sugestão só: as outras a mãe já editou.
  for (const item of before.items.filter((candidate) => candidate.name !== "Toalha com capuz")) {
    const patch = await page.request.patch(`/api/me/checklist/${item.id}`, { data: { qty: 9 } });
    expect(patch.ok()).toBe(true);
  }
  await openList(page);
  await expect(page.getByTestId("suggestions-notice")).toBeVisible();

  await page.getByTestId("input-checklist-search").fill("toalha");
  await expect(itemRow(page, "Toalha com capuz")).toContainText("Sugestão");
  await itemRow(page, "Toalha com capuz").getByRole("radio", { name: "ganhei" }).click();

  await expect(itemRow(page, "Toalha com capuz")).not.toContainText("Sugestão");
  await expect(page.getByTestId("suggestions-notice")).toHaveCount(0);
  // Fechou sozinho: no servidor o aviso continua "não dispensado", só não há mais o que avisar.
  expect((await workspace(page)).items.some((item) => item.suggested)).toBe(false);
});

// ─── E2 · Categorias ─────────────────────────────────────────────────────────

test("criar categoria, usar num item e ver a linha no orçamento; renomear muda nos dois lugares", async ({ page }) => {
  await createAccount(page);
  await openList(page);

  await page.getByTestId("button-new-category").click();
  const dialog = page.getByRole("dialog", { name: "Nova categoria" });
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("input-category-name").fill("Passeio");
  await dialog.getByRole("radio", { name: "Mala" }).click();
  await expect(dialog.getByRole("radio", { name: "Mala" })).toHaveAttribute("aria-checked", "true");
  await expectAccessible(page);
  await dialog.getByTestId("button-save-category").click();
  await expect(dialog).toBeHidden();

  // A categoria nova já abre, vazia, com o convite para o primeiro item (LC-R7).
  await expect(page.getByRole("heading", { level: 2, name: "Passeio" })).toBeVisible();
  await expect(page.getByText("Nenhum item em Passeio ainda.")).toBeVisible();
  await page.getByTestId("button-phone-add-category-item").click();
  const add = page.getByRole("dialog", { name: "Adicionar item" });
  await expect(add.getByText("Este item entra em Passeio.")).toBeVisible();
  await add.getByTestId("input-new-item").fill("Cadeirinha");
  await add.getByTestId("input-item-price").pressSequentially("500");
  await add.getByTestId("input-new-item").press("Enter");
  await expect(add).toBeHidden();
  await itemRow(page, "Cadeirinha").getByRole("radio", { name: "comprei" }).click();
  await expect(itemRow(page, "Cadeirinha").getByRole("radio", { name: "comprei" })).toHaveAttribute("aria-checked", "true");

  // Linha nova no Orçamento, começando em zero (LC-R13).
  await page.goto("/budget");
  const planned = page.getByLabel("Orçamento planejado para Passeio, em reais");
  await expect(planned).toHaveValue("");
  await expect(page.locator(".budget-row", { hasText: "Passeio" })).toContainText(/R\$\s500,00 de R\$\s0,00/);
  await planned.fill("400");
  await planned.blur();
  await page.getByTestId("button-save-budget").click();
  await expect(page.getByText("Orçamento salvo.")).toBeVisible();
  await expect(page.getByTestId("budget-over-notice")).toContainText(/Passeio passou R\$\s100,00 do previsto/);
  await expectAccessible(page);

  await openList(page);
  await page.getByTestId("button-phone-category-passeio").click();
  await page.getByTestId("button-edit-category").click();
  const edit = page.getByRole("dialog", { name: "Editar categoria" });
  await expect(edit.getByTestId("input-category-name")).toHaveValue("Passeio");
  await edit.getByTestId("input-category-name").fill("Passeios");
  await edit.getByTestId("button-save-category").click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: "Passeios" })).toBeVisible();
  await expect(itemRow(page, "Cadeirinha")).toBeVisible();

  await page.goto("/budget");
  await expect(page.getByLabel("Orçamento planejado para Passeios, em reais")).toHaveValue("400,00");
  // O nome novo vale também no item (link público e exportação leem de lá).
  expect((await workspace(page)).items.find((item) => item.name === "Cadeirinha")!.category).toBe("Passeios");
});

test("nome repetido é recusado; excluir categoria com itens pede o destino", async ({ page }) => {
  await createAccount(page);
  await openList(page);

  await page.getByTestId("button-new-category").click();
  const create = page.getByRole("dialog", { name: "Nova categoria" });
  await create.getByTestId("input-category-name").fill("  roupas ");
  await expect(create.getByRole("alert")).toHaveText(/Já existe uma categoria com esse nome nesta lista\./);
  await expect(create.getByTestId("button-save-category")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(create).toBeHidden();

  // Mover: os três itens de Higiene vão para Acessórios.
  await page.getByTestId("button-phone-category-higiene").click();
  await page.getByTestId("button-edit-category").click();
  await page.getByTestId("button-delete-category").click();
  const remove = page.getByRole("dialog", { name: "Excluir “Higiene”?" });
  await expect(remove).toContainText("Esta categoria tem 3 itens.");
  await expect(remove.getByRole("radio", { name: /Mover para outra categoria/ })).toHaveAttribute("aria-checked", "true");
  await expectAccessible(page);
  await remove.getByTestId("select-category-target").selectOption({ label: "Acessórios" });
  await remove.getByTestId("button-confirm-delete-category").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("button-phone-category-higiene")).toHaveCount(0);
  await page.getByTestId("button-phone-category-acessórios").click();
  await expect(itemRow(page, "Toalha com capuz")).toBeVisible();
  await expect(itemRow(page, "Bolsa da maternidade")).toBeVisible();

  // Apagar junto: os dois itens de Alimentação saem com ela.
  await page.getByTestId("button-phone-category-alimentação").click();
  await page.getByTestId("button-edit-category").click();
  await page.getByTestId("button-delete-category").click();
  const removeAll = page.getByRole("dialog", { name: "Excluir “Alimentação”?" });
  await removeAll.getByRole("radio", { name: /Apagar os 2 itens junto/ }).click();
  await expect(removeAll.getByTestId("select-category-target")).toHaveCount(0);
  await removeAll.getByTestId("button-confirm-delete-category").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("button-phone-category-alimentação")).toHaveCount(0);

  const after = await workspace(page);
  expect(after.categories.map((category) => category.name)).toEqual(["Roupas", "Acessórios"]);
  expect(after.items.map((item) => item.name)).not.toContain("Babador de tecido");
  expect(after.items.filter((item) => item.category === "Acessórios")).toHaveLength(5);
  expect(after.items).toHaveLength(8);

  // O Orçamento acompanha: só as linhas que sobraram.
  await page.goto("/budget");
  await expect(page.locator(".budget-row")).toHaveCount(2);
});

// ─── E3 · Listas ─────────────────────────────────────────────────────────────

test("criar lista pelo modelo, alternar, renomear e excluir", async ({ page }) => {
  await createAccount(page);
  await openList(page);

  await page.getByTestId("button-new-list").click();
  const create = page.getByRole("dialog", { name: "Nova lista" });
  await expect(create.getByRole("radio", { name: /Mala da maternidade/ })).toHaveAttribute("aria-checked", "true");
  await expect(create.getByTestId("input-checklist-name")).toHaveValue("Mala da maternidade");
  // O nome acompanha o modelo até a pessoa escrever o próprio.
  await create.getByRole("radio", { name: /Quarto do bebê/ }).click();
  await expect(create.getByTestId("input-checklist-name")).toHaveValue("Quarto do bebê");
  await create.getByRole("radio", { name: /Mala da maternidade/ }).click();
  await expectAccessible(page);
  await create.getByTestId("button-confirm-create-checklist").click();
  await expect(create).toBeHidden();

  // A lista nova abre na hora, com as categorias e as sugestões do modelo (LC-R17).
  await expect(page.getByTestId("text-list-name")).toHaveText("Mala da maternidade");
  await expect(page.getByTestId("suggestions-notice")).toBeVisible();
  await expect(page.getByTestId("button-phone-category-para-a-mãe")).toBeVisible();
  await expect(page.getByTestId("button-phone-category-documentos")).toBeVisible();
  await expect(itemRow(page, "Chinelo")).toContainText("Sugestão");
  await expect(itemRow(page, "Body manga curta")).toHaveCount(0);
  await expect(page.getByText(/0 de 13 itens resolvidos\./)).toBeVisible();

  // A busca vale só para a lista aberta (LC-R18).
  await page.getByTestId("input-checklist-search").fill("body");
  await expect(itemRow(page, "Body e macacão RN")).toBeVisible();
  await expect(itemRow(page, "Body manga curta")).toHaveCount(0);
  await page.getByTestId("button-clear-checklist-search").click();

  // O aparelho lembra a última lista aberta.
  await page.reload();
  await expect(page.getByTestId("text-list-name")).toHaveText("Mala da maternidade");

  await page.getByRole("button", { name: "Enxoval do bebê", exact: true }).click();
  await expect(page.getByTestId("text-list-name")).toHaveText("Enxoval do bebê");
  await expect(itemRow(page, "Body manga curta")).toBeVisible();
  await expect(itemRow(page, "Chinelo")).toHaveCount(0);

  // Início, Orçamento e Perfil passam a falar em listas (LC-R22 a R24).
  await page.goto("/");
  const byList = page.locator(".overview-categories");
  await expect(byList.getByRole("heading", { name: "Por lista" })).toBeVisible();
  await expect(byList).toContainText("Enxoval do bebê");
  await expect(byList).toContainText("Mala da maternidade");
  await expect(page.getByTestId("button-open-overview-list")).toContainText("0 de 23 itens");
  await page.goto("/budget");
  await expect(page.locator(".budget-group-title")).toHaveText(["Enxoval do bebê", "Mala da maternidade"]);
  await expect(page.getByLabel("Orçamento planejado para Documentos (Mala da maternidade), em reais")).toBeVisible();
  await expectAccessible(page);
  await page.goto("/profile");
  await expect(page.getByTestId("text-shared-list")).toHaveText("Enxoval do bebê");

  // Renomear.
  await openList(page);
  await page.getByRole("button", { name: "Mala da maternidade", exact: true }).click();
  await page.getByTestId("button-edit-list").click();
  const edit = page.getByRole("dialog", { name: "Editar lista" });
  await edit.getByTestId("input-checklist-name").fill("Mala do hospital");
  await edit.getByTestId("button-save-checklist").click();
  await expect(edit).toBeHidden();
  await expect(page.getByTestId("text-list-name")).toHaveText("Mala do hospital");
  await expect(page.getByRole("button", { name: "Mala do hospital", exact: true })).toHaveAttribute("aria-current", "true");

  // Excluir diz quantos itens somem e volta para a lista que sobrou (LC-R20).
  await page.getByTestId("button-edit-list").click();
  await page.getByTestId("button-delete-checklist").click();
  const confirm = page.getByRole("dialog", { name: "Excluir “Mala do hospital”?" });
  await expect(confirm).toContainText("13 itens serão apagados");
  await confirm.getByTestId("button-confirm-action").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("text-list-name")).toHaveText("Enxoval do bebê");
  await expect(page.getByRole("button", { name: "Mala do hospital", exact: true })).toHaveCount(0);
  await expect(itemRow(page, "Body manga curta")).toBeVisible();

  // A última lista só pode ser renomeada.
  await page.getByTestId("button-edit-list").click();
  await expect(page.getByTestId("hint-only-list")).toBeVisible();
  await expect(page.getByTestId("button-delete-checklist")).toHaveCount(0);
  const after = await workspace(page);
  expect(after.lists.map((list) => list.name)).toEqual(["Enxoval do bebê"]);
  expect(after.items).toHaveLength(10);
  expect(after.categories).toHaveLength(4);
});

test("lista em branco começa com uma categoria e sem aviso; o link público mostra só a primeira lista", async ({ page }) => {
  await createAccount(page);
  const share = await page.request.post("/api/me/share", { data: {} });
  const { token } = (await share.json()) as { token: string };
  await openList(page);

  await page.getByTestId("button-new-list").click();
  const create = page.getByRole("dialog", { name: "Nova lista" });
  await create.getByRole("radio", { name: /Em branco/ }).click();
  await create.getByTestId("input-checklist-name").fill("Chá revelação");
  await create.getByTestId("button-confirm-create-checklist").click();
  await expect(page.getByTestId("text-list-name")).toHaveText("Chá revelação");
  await expect(page.getByTestId("suggestions-notice")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "Geral" })).toBeVisible();

  // A única categoria da lista só pode ser renomeada (LC-R11).
  await page.getByTestId("button-edit-category").click();
  await expect(page.getByTestId("hint-only-category")).toBeVisible();
  await expect(page.getByTestId("button-delete-category")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByTestId("button-phone-add-category-item").click();
  const add = page.getByRole("dialog", { name: "Adicionar item" });
  await add.getByTestId("input-new-item").fill("Balões");
  await add.getByTestId("input-new-item").press("Enter");
  await expect(itemRow(page, "Balões")).toBeVisible();

  const publicList = (await (await page.request.get(`/api/gift/${token}`)).json()) as {
    items: Array<{ id: number; name: string; category: string; categoryIcon: string | null }>;
  };
  expect(publicList.items.map((item) => item.name)).not.toContain("Balões");
  expect(publicList.items).toHaveLength(10);
  expect(publicList.items[0]).toMatchObject({ name: "Body manga curta", category: "Roupas", categoryIcon: "heart" });

  // E um convidado não consegue reservar item de outra lista pelo link.
  const balloons = (await workspace(page)).items.find((item) => item.name === "Balões")!;
  const reserve = await page.request.post(`/api/gift/${token}/reservations`, {
    data: { itemId: balloons.id, guestName: "Tia Rosa", guestPhone: "(11) 91234-5678", status: "vou presentear" },
  });
  expect(reserve.status()).toBe(404);
});

// ─── Base · API ──────────────────────────────────────────────────────────────

test("a API recusa lista e categoria de outra conta, nomes repetidos e o que passa dos limites", async ({ page, browser }) => {
  await createAccount(page);
  const mine = await workspace(page);
  const list = mine.lists[0]!;
  const roupas = mine.categories.find((category) => category.name === "Roupas")!;

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await createAccount(otherPage);
  const theirs = await workspace(otherPage);
  await otherContext.close();
  const foreignList = theirs.lists[0]!.id;
  const foreignCategory = theirs.categories[0]!.id;

  // O que é de outra conta não existe (LC-R27).
  expect((await page.request.patch(`/api/me/checklists/${foreignList}`, { data: { name: "Minha agora" } })).status()).toBe(404);
  expect((await page.request.delete(`/api/me/checklists/${foreignList}`)).status()).toBe(404);
  expect((await page.request.post(`/api/me/checklists/${foreignList}/categories`, { data: { name: "Invasora", icon: "heart" } })).status()).toBe(404);
  expect((await page.request.patch(`/api/me/checklist-categories/${foreignCategory}`, { data: { name: "Minha agora" } })).status()).toBe(404);
  expect((await page.request.delete(`/api/me/checklist-categories/${foreignCategory}?items=delete`)).status()).toBe(404);
  expect((await page.request.post("/api/me/checklist", { data: { name: "Intruso", categoryId: foreignCategory } })).status()).toBe(404);
  const moveOut = await page.request.patch(`/api/me/checklist/${mine.items[0]!.id}`, { data: { categoryId: foreignCategory } });
  expect(moveOut.status()).toBe(404);
  expect((await page.request.delete(`/api/me/checklist-categories/${roupas.id}?moveTo=${foreignCategory}`)).status()).toBe(400);

  // Item sem categoria não entra.
  const orphan = await page.request.post("/api/me/checklist", { data: { name: "Sem lugar" } });
  expect(orphan.status()).toBe(400);
  expect(await orphan.json()).toEqual({ error: "Escolha uma categoria para o item." });

  // Nome repetido, com ou sem acento (LC-R8).
  const repeated = await page.request.post(`/api/me/checklists/${list.id}/categories`, { data: { name: "ALIMENTACAO", icon: "heart" } });
  expect(repeated.status()).toBe(409);
  expect(await repeated.json()).toEqual({ error: "Já existe uma categoria com esse nome nesta lista." });
  const renameClash = await page.request.patch(`/api/me/checklist-categories/${roupas.id}`, { data: { name: "higiene" } });
  expect(renameClash.status()).toBe(409);
  const badIcon = await page.request.post(`/api/me/checklists/${list.id}/categories`, { data: { name: "Carro", icon: "foguete" } });
  expect(badIcon.status()).toBe(400);
  expect(await badIcon.json()).toEqual({ error: "Escolha um dos ícones da lista." });

  // Com itens, excluir sem dizer para onde eles vão não apaga nada (LC-R10).
  const undecided = await page.request.delete(`/api/me/checklist-categories/${roupas.id}`);
  expect(undecided.status()).toBe(409);
  expect(await undecided.json()).toEqual({ error: "Esta categoria tem 3 itens. Escolha para onde eles vão.", itemCount: 3 });
  expect((await workspace(page)).items).toHaveLength(10);

  // Limite de 12 categorias por lista (LC-R12): já são 4, cabem mais 8. A cor segue o rodízio.
  const tones: string[] = [];
  for (let n = 1; n <= 8; n += 1) {
    const created = await page.request.post(`/api/me/checklists/${list.id}/categories`, { data: { name: `Extra ${n}`, icon: "bed" } });
    expect(created.status()).toBe(201);
    tones.push(((await created.json()) as Category).tone);
  }
  expect(tones.slice(0, 4)).toEqual(["lilac", "mint", "peach", "butter"]);
  const overCategories = await page.request.post(`/api/me/checklists/${list.id}/categories`, { data: { name: "Uma a mais", icon: "bed" } });
  expect(overCategories.status()).toBe(409);
  expect(await overCategories.json()).toEqual({ error: "Esta lista chegou ao limite de 12 categorias. Exclua uma para criar outra." });

  // Limite de 10 listas por conta (LC-R21) e a última que sobra (LC-R20).
  const created: number[] = [];
  for (let n = 2; n <= 10; n += 1) {
    const response = await page.request.post("/api/me/checklists", { data: { template: "em-branco", name: `Lista ${n}` } });
    expect(response.status()).toBe(201);
    created.push(((await response.json()) as { list: { id: number } }).list.id);
  }
  const overLists = await page.request.post("/api/me/checklists", { data: { template: "em-branco", name: "Lista 11" } });
  expect(overLists.status()).toBe(409);
  expect(await overLists.json()).toEqual({ error: "Você chegou ao limite de 10 listas. Exclua uma para criar outra." });
  expect((await page.request.post("/api/me/checklists", { data: { template: "inventado", name: "X" } })).status()).toBe(400);

  // A única categoria de uma lista não sai.
  const blank = (await workspace(page)).categories.find((category) => category.listId === created[0])!;
  const onlyCategory = await page.request.delete(`/api/me/checklist-categories/${blank.id}`);
  expect(onlyCategory.status()).toBe(409);
  expect(await onlyCategory.json()).toEqual({ error: "Esta é a única categoria da lista. Dá para renomear, mas não excluir." });

  for (const id of [list.id, ...created.slice(1)]) {
    expect((await page.request.delete(`/api/me/checklists/${id}`)).status()).toBe(204);
  }
  const lastList = await page.request.delete(`/api/me/checklists/${created[0]}`);
  expect(lastList.status()).toBe(409);
  expect(await lastList.json()).toEqual({ error: "Esta é a sua única lista. Dá para renomear, mas não excluir." });
  const end = await workspace(page);
  expect(end.lists).toHaveLength(1);
  expect(end.items).toHaveLength(0);
  expect(end.categories).toHaveLength(1);
});

test("inspiração entra na primeira lista, na categoria de mesmo nome, recriada se preciso", async ({ page }) => {
  await createAccount(page);
  const before = await workspace(page);
  const higiene = before.categories.find((category) => category.name === "Higiene")!;
  // Uma segunda lista não muda o destino: inspiração é do enxoval.
  await page.request.post("/api/me/checklists", { data: { template: "mala-maternidade", name: "Mala" } });

  const first = await page.request.post("/api/me/checklist", { data: { name: "Kit higiene", recommendationId: "kit-higiene" } });
  expect(first.status()).toBe(201);
  expect((await first.json()) as Item).toMatchObject({ categoryId: higiene.id, category: "Higiene", listId: higiene.listId, suggested: false });

  // A mãe renomeou "Higiene": a inspiração seguinte recria a categoria, com a cara de antes.
  await page.request.patch(`/api/me/checklist-categories/${higiene.id}`, { data: { name: "Banho" } });
  const second = await page.request.post("/api/me/checklist", { data: { name: "Toalha", recommendationId: "toalha-capuz" } });
  expect(second.status()).toBe(201);
  const item = (await second.json()) as Item;
  const after = await workspace(page);
  const recreated = after.categories.find((category) => category.id === item.categoryId)!;
  expect(recreated).toMatchObject({ name: "Higiene", icon: "clipboard", tone: "mint", listId: higiene.listId });
  expect(recreated.id).not.toBe(higiene.id);

  // Na tela, a inspiração aparece na categoria recriada da primeira lista.
  await openList(page);
  await page.getByTestId("button-phone-category-higiene").click();
  await expect(itemRow(page, "Toalha")).toBeVisible();
});

// ─── Base · contas de antes das listas ───────────────────────────────────────

test("conta de antes das listas abre com os mesmos itens, o mesmo orçamento e as sugestões certas", async ({ page }) => {
  const { email } = await createAccount(page);
  const seeded = await workspace(page);
  const share = await page.request.post("/api/me/share", { data: {} });
  const { token } = (await share.json()) as { token: string };

  // Volta a conta ao formato antigo: itens só com o nome da categoria e orçamento na tabela velha.
  await withTestDb(async (db) => {
    const { rows } = await db.query<{ id: string }>("SELECT id FROM auth_users WHERE email = $1", [email]);
    const userId = rows[0]!.id;
    await db.query("DELETE FROM checklist_categories WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM checklists WHERE user_id = $1", [userId]);
    await db.query("UPDATE checklist_items SET list_id = NULL, category_id = NULL, suggested = false WHERE user_id = $1", [userId]);
    await db.query("UPDATE checklist_items SET qty = 8 WHERE user_id = $1 AND name = 'Body manga curta'", [userId]);
    await db.query("UPDATE checklist_items SET status = 'Comprado' WHERE user_id = $1 AND name = 'Cueiro leve'", [userId]);
    await db.query(
      "INSERT INTO checklist_items (user_id, name, category, \"group\", qty, price) VALUES ($1, 'Manta de tricô', 'Roupas', 'Adicionado por você', 1, 0)",
      [userId],
    );
    await db.query(
      "INSERT INTO budget_categories (user_id, category, planned) VALUES ($1, 'Roupas', 1500), ($1, 'Higiene', 680), ($1, 'Alimentação', 0), ($1, 'Acessórios', 940)",
      [userId],
    );
  });

  // O primeiro acesso migra a conta (LC-R26).
  const migrated = await workspace(page);
  expect(migrated.lists.map((list) => list.name)).toEqual(["Enxoval do bebê"]);
  expect(migrated.categories.map(({ name, planned, icon, tone }) => ({ name, planned, icon, tone }))).toEqual([
    { name: "Roupas", planned: "1500.00", icon: "heart", tone: "lilac" },
    { name: "Higiene", planned: "680.00", icon: "clipboard", tone: "mint" },
    { name: "Alimentação", planned: "0.00", icon: "utensils", tone: "peach" },
    { name: "Acessórios", planned: "940.00", icon: "sparkles", tone: "butter" },
  ]);
  expect(migrated.items).toHaveLength(seeded.items.length + 1);
  const listId = migrated.lists[0]!.id;
  const categoryByName = new Map(migrated.categories.map((category) => [category.name, category.id]));
  for (const item of migrated.items) {
    expect(item.listId, item.name).toBe(listId);
    expect(item.categoryId, item.name).toBe(categoryByName.get(item.category));
  }
  // Só o que continua igual ao modelo é sugestão: o que ela mexeu, comprou ou criou é dela.
  const notSuggested = migrated.items.filter((item) => !item.suggested).map((item) => item.name).sort();
  expect(notSuggested).toEqual(["Body manga curta", "Cueiro leve", "Manta de tricô"]);
  await withTestDb(async (db) => {
    const { rows } = await db.query<{ n: string }>(
      "SELECT count(*) AS n FROM budget_categories WHERE user_id = (SELECT id FROM auth_users WHERE email = $1)",
      [email],
    );
    expect(Number(rows[0]!.n)).toBe(0);
  });

  // Migrar de novo não duplica nada, e o link público continua funcionando.
  expect((await workspace(page)).categories).toHaveLength(4);
  const publicList = (await (await page.request.get(`/api/gift/${token}`)).json()) as { items: Array<{ name: string }> };
  expect(publicList.items.map((item) => item.name)).toContain("Manta de tricô");
  expect(publicList.items.map((item) => item.name)).not.toContain("Cueiro leve");

  await openList(page);
  await expect(page.getByTestId("suggestions-notice")).toBeVisible();
  await expect(itemRow(page, "Macacão de algodão")).toContainText("Sugestão");
  await expect(itemRow(page, "Manta de tricô")).not.toContainText("Sugestão");
  await page.goto("/budget");
  await expect(page.getByLabel("Orçamento planejado para Roupas, em reais")).toHaveValue("1500,00");
});
