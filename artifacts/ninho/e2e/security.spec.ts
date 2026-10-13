import { expect, test } from "@playwright/test";
import { createAccount } from "./support";

test("a API responde com cabeçalhos de segurança e sem X-Powered-By", async ({ page }) => {
  await createAccount(page);
  const response = await page.request.get("/api/me/workspace");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  expect(headers["cache-control"]).toBe("no-store");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("outro site não consegue alterar dados, nem com a sessão no navegador", async ({ page }) => {
  await createAccount(page, { displayName: "Ana" });

  const crossSite = await page.request.put("/api/me/profile", {
    data: { displayName: "Invasor" },
    headers: { origin: "https://site-malicioso.example" },
  });
  expect(crossSite.status()).toBe(403);
  expect(await crossSite.json()).toEqual({ error: "Origem não permitida." });

  const blindForm = await page.request.post("/api/me/checklist", {
    form: { name: "Item de formulário" },
    headers: { "sec-fetch-site": "cross-site" },
  });
  expect(blindForm.status()).toBe(403);

  const workspace = await (await page.request.get("/api/me/workspace")).json() as { profile: { displayName: string } };
  expect(workspace.profile.displayName).toBe("Ana");
});

test("corpo que não é JSON é recusado com mensagem em português", async ({ page }) => {
  await createAccount(page);
  const form = await page.request.post("/api/me/checklist", { form: { name: "Item de formulário" } });
  expect(form.status()).toBe(400);

  const broken = await page.request.post("/api/auth/login", {
    headers: { "content-type": "application/json" },
    data: "{quebrado",
  });
  expect(broken.status()).toBe(400);
  expect(await broken.json()).toEqual({ error: "Não conseguimos ler os dados enviados." });
});

test("orçamento só aceita categorias da própria conta", async ({ page, browser }) => {
  await createAccount(page);
  const mine = (await (await page.request.get("/api/me/workspace")).json()) as { categories: Array<{ id: number; name: string }> };
  const roupas = mine.categories.find((category) => category.name === "Roupas")!;

  // Outra conta, em outro navegador: a categoria dela não existe para esta.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await createAccount(otherPage);
  const theirs = (await (await otherPage.request.get("/api/me/workspace")).json()) as { categories: Array<{ id: number; planned: string }> };
  const foreign = await page.request.put("/api/me/budget", {
    data: { categories: [{ categoryId: theirs.categories[0]!.id, planned: 1 }] },
  });
  expect(foreign.status()).toBe(400);
  expect(await foreign.json()).toEqual({ error: "Escolha uma das categorias da lista." });
  const untouched = (await (await otherPage.request.get("/api/me/workspace")).json()) as typeof theirs;
  expect(untouched.categories[0]!.planned).toBe(theirs.categories[0]!.planned);
  await otherContext.close();

  // O formato antigo (pelo nome) não vale mais.
  const byName = await page.request.put("/api/me/budget", {
    data: { categories: [{ category: "Roupas", planned: 100 }] },
  });
  expect(byName.status()).toBe(400);

  const repeated = await page.request.put("/api/me/budget", {
    data: { categories: [{ categoryId: roupas.id, planned: 1 }, { categoryId: roupas.id, planned: 2 }] },
  });
  expect(repeated.status()).toBe(400);
  expect(await repeated.json()).toEqual({ error: "Cada categoria aparece uma vez só." });

  const tooMany = await page.request.put("/api/me/budget", {
    data: { categories: Array.from({ length: 500 }, (_, index) => ({ categoryId: index + 1, planned: 1 })) },
  });
  expect(tooMany.status()).toBe(400);
  expect(await tooMany.json()).toEqual({ error: "São categorias demais para um orçamento só." });

  const saved = await page.request.put("/api/me/budget", {
    data: { categories: [{ categoryId: roupas.id, planned: 1500.5 }] },
  });
  expect(saved.status()).toBe(200);
  const after = (await saved.json()) as Array<{ id: number; planned: string }>;
  expect(after.find((category) => category.id === roupas.id)!.planned).toBe("1500.50");
});
