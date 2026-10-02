import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createAccount, randomClientIp } from "./support";

const PIX = { key: "529.982.247-25", recipientName: "Ana Lima", city: "São Paulo" };

type OwnerItem = { id: number; name: string; kind: string; summary: { state: string; committed: number; confirmed: number; remaining: number } };
type OwnerList = { list: { id: number; token: string; items: OwnerItem[] }; pledges: { id: number; status: string; guestName: string | null }[]; pixReady: boolean };

async function createList(page: Page, template: string): Promise<OwnerList> {
  const created = await page.request.post("/api/me/lists", { data: { template } });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = await created.json() as { id: number };
  return readList(page, id);
}

async function readList(page: Page, id: number): Promise<OwnerList> {
  const detail = await page.request.get(`/api/me/lists/${id}`);
  expect(detail.ok()).toBe(true);
  return detail.json() as Promise<OwnerList>;
}

/** Cada pedido de convidado vem de uma origem diferente, para o limite por origem não interferir. */
function pledge(request: APIRequestContext, token: string, data: Record<string, unknown>) {
  return request.post(`/api/lists/${token}/pledges`, { data, headers: { "x-forwarded-for": randomClientIp() } });
}

const byName = (list: OwnerList, name: string) => list.list.items.find((item) => item.name === name)!;

test("contribuições em valor: parte, completar, confirmar; a página pública não vaza chave nem nomes", async ({ page }) => {
  await createAccount(page);
  const list = await createList(page, "cha-de-bebe");
  const carrinho = byName(list, "Carrinho de bebê");
  const { token } = list.list;

  // Sem Pix cadastrado, a lista não aceita valor.
  const early = await pledge(page.request, token, { itemId: carrinho.id, kind: "money", amountCents: 5000 });
  expect(early.status()).toBe(409);
  expect((await early.json()).reason).toBe("pix-missing");

  expect((await page.request.put("/api/me/pix", { data: PIX })).ok()).toBe(true);

  const first = await pledge(page.request, token, { itemId: carrinho.id, kind: "money", amountCents: 45000, guestName: "Tia Carla" });
  expect(first.status(), await first.text()).toBe(201);
  const firstBody = await first.json() as { manageToken: string; pledge: { pix: { payload: string; recipientName: string; keyMasked: string } } };
  expect(firstBody.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(firstBody.pledge.pix.payload).toContain("5406450.00");
  expect(firstBody.pledge.pix.payload).toContain("52998224725");
  expect(firstBody.pledge.pix.recipientName).toBe("ANA LIMA");
  expect(firstBody.pledge.pix.keyMasked).toBe("***.982.247-**");

  // Com contribuição, "item inteiro" deixa de valer e o teto é o que falta.
  const whole = await pledge(page.request, token, { itemId: carrinho.id, kind: "whole", wholeMode: "bring" });
  expect((await whole.json()).reason).toBe("whole-unavailable");
  const tooMuch = await pledge(page.request, token, { itemId: carrinho.id, kind: "money", amountCents: 75001 });
  expect(await tooMuch.json()).toMatchObject({ reason: "too-high", remaining: 75000, error: expect.stringContaining("750,00") });

  const rest = await pledge(page.request, token, { itemId: carrinho.id, kind: "money", amountCents: 75000, guestName: "Pedro" });
  expect(rest.status()).toBe(201);

  const publicResponse = await page.request.get(`/api/lists/${token}`);
  const publicText = await publicResponse.text();
  const publicItem = (JSON.parse(publicText) as { items: { id: number; state: string; remaining: number; committed: number }[] }).items.find((item) => item.id === carrinho.id)!;
  expect(publicItem).toMatchObject({ state: "complete", remaining: 0, committed: 120000 });
  expect(publicText).not.toContain("52998224725");
  expect(publicText).not.toContain("Tia Carla");
  expect(publicText).not.toContain("Pedro");
  expect(publicText).not.toContain("45000");

  // A mãe vê quem deu, confirma e pode desfazer.
  const owner = await readList(page, list.list.id);
  expect(owner.pledges.map((item) => item.guestName)).toEqual(["Tia Carla", "Pedro"]);
  const confirm = await page.request.patch(`/api/me/lists/${list.list.id}/pledges/${owner.pledges[0]!.id}`, { data: { status: "confirmed" } });
  expect(confirm.ok()).toBe(true);
  expect(byName(await readList(page, list.list.id), "Carrinho de bebê").summary).toMatchObject({ confirmed: 45000, committed: 120000 });

  const undo = await page.request.patch(`/api/me/lists/${list.list.id}/pledges/${owner.pledges[1]!.id}`, { data: { status: "cancelled" } });
  expect(undo.ok()).toBe(true);
  expect(byName(await readList(page, list.list.id), "Carrinho de bebê").summary).toMatchObject({ state: "progress", remaining: 75000 });
  const revive = await page.request.patch(`/api/me/lists/${list.list.id}/pledges/${owner.pledges[1]!.id}`, { data: { status: "confirmed" } });
  expect(revive.status()).toBe(409);
});

test("duas pessoas disputando o mesmo saldo: só uma entra", async ({ page }) => {
  await createAccount(page);
  const list = await createList(page, "cha-de-bebe");
  await page.request.put("/api/me/pix", { data: PIX });
  const berco = byName(list, "Berço");

  const attempts = await Promise.all(Array.from({ length: 4 }, () =>
    pledge(page.request, list.list.token, { itemId: berco.id, kind: "money", amountCents: 90000 })));
  const statuses = attempts.map((response) => response.status()).sort();
  expect(statuses).toEqual([201, 409, 409, 409]);
  expect(byName(await readList(page, list.list.id), "Berço").summary).toMatchObject({ committed: 90000, remaining: 0, state: "complete" });
});

test("item inteiro: o nome só aparece se a pessoa deixar, e o item fecha", async ({ page }) => {
  await createAccount(page);
  const list = await createList(page, "cha-de-bebe");
  const { token } = list.list;
  const banheira = byName(list, "Banheira");
  const kit = byName(list, "Kit de mamadeiras");

  expect((await pledge(page.request, token, { itemId: banheira.id, kind: "whole", guestName: "Marina", showName: true })).status()).toBe(201);
  expect((await pledge(page.request, token, { itemId: kit.id, kind: "whole", guestName: "Rafa", showName: false })).status()).toBe(201);
  const second = await pledge(page.request, token, { itemId: banheira.id, kind: "whole" });
  expect((await second.json()).reason).toBe("taken");

  const text = await (await page.request.get(`/api/lists/${token}`)).text();
  const items = (JSON.parse(text) as { items: { id: number; state: string; wholeBy: string | null }[] }).items;
  expect(items.find((item) => item.id === banheira.id)).toMatchObject({ state: "whole", wholeBy: "Marina" });
  expect(items.find((item) => item.id === kit.id)).toMatchObject({ state: "whole", wholeBy: null });
  expect(text).not.toContain("Rafa");
});

test("unidades divididas, cancelamento pelo convidado e trava depois de confirmado", async ({ page }) => {
  await createAccount(page);
  const list = await createList(page, "cha-de-fralda");
  const { token } = list.list;
  const fralda = byName(list, "Fralda P");

  const eight = await pledge(page.request, token, { itemId: fralda.id, kind: "units", units: 8, guestName: "Juliana" });
  expect(eight.status()).toBe(201);
  const { manageToken } = await eight.json() as { manageToken: string };
  const five = await pledge(page.request, token, { itemId: fralda.id, kind: "units", units: 5 });
  expect(await five.json()).toMatchObject({ reason: "too-high", remaining: 4 });

  const mine = await page.request.post(`/api/lists/${token}/pledges/lookup`, { data: { tokens: [manageToken] } });
  expect((await mine.json()).pledges).toMatchObject([{ itemName: "Fralda P", units: 8, status: "promised", manageToken }]);

  expect((await page.request.post(`/api/lists/${token}/pledges/cancel`, { data: { manageToken } })).status()).toBe(204);
  expect(byName(await readList(page, list.list.id), "Fralda P").summary).toMatchObject({ state: "open", remaining: 12 });

  const again = await pledge(page.request, token, { itemId: fralda.id, kind: "units", units: 2 });
  const againToken = (await again.json() as { manageToken: string }).manageToken;
  const owner = await readList(page, list.list.id);
  const active = owner.pledges.find((item) => item.status === "promised")!;
  await page.request.patch(`/api/me/lists/${list.list.id}/pledges/${active.id}`, { data: { status: "confirmed" } });
  expect((await page.request.post(`/api/lists/${token}/pledges/cancel`, { data: { manageToken: againToken } })).status()).toBe(409);
});

test("com contribuição, a mãe não troca o tipo nem baixa a meta abaixo do prometido", async ({ page }) => {
  await createAccount(page);
  const list = await createList(page, "cha-de-fralda");
  const fralda = byName(list, "Fralda M");
  await pledge(page.request, list.list.token, { itemId: fralda.id, kind: "units", units: 6 });

  const url = `/api/me/lists/${list.list.id}/items/${fralda.id}`;
  const kind = await page.request.patch(url, { data: { kind: "single" } });
  expect(kind.status()).toBe(409);
  const low = await page.request.patch(url, { data: { goalUnits: 5 } });
  expect(low.status()).toBe(409);
  expect((await low.json()).error).toContain("abaixo do que já foi prometido");
  expect((await page.request.patch(url, { data: { goalUnits: 6, note: "sem perfume" } })).ok()).toBe(true);
});

test("link de loja só https; listas de outra conta não abrem; exportação inclui listas e Pix", async ({ page, browser, baseURL }) => {
  await createAccount(page);
  const list = await createList(page, "em-branco");
  const items = `/api/me/lists/${list.list.id}/items`;
  const http = await page.request.post(items, { data: { name: "Babá eletrônica", kind: "single", storeUrl: "http://loja.exemplo.com/baba" } });
  expect(http.status()).toBe(400);
  expect((await http.json()).error).toBe("Use um link que comece com https://");
  const ok = await page.request.post(items, { data: { name: "Babá eletrônica", kind: "single", storeUrl: "https://www.loja.exemplo.com/baba" } });
  expect(ok.status()).toBe(201);
  const publicList = await (await page.request.get(`/api/lists/${list.list.token}`)).json() as { items: { storeDomain: string }[] };
  expect(publicList.items[0]!.storeDomain).toBe("loja.exemplo.com");

  await page.request.put("/api/me/pix", { data: PIX });
  const exported = await (await page.request.get("/api/me/export")).json() as { giftLists: { name: string; token?: string }[]; pixAccount: { key: string } };
  expect(exported.giftLists).toMatchObject([{ name: "Lista de presentes" }]);
  expect(exported.giftLists[0]!.token).toBeUndefined();
  expect(exported.pixAccount.key).toBe("52998224725");

  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await createAccount(otherPage);
  expect((await otherPage.request.get(`/api/me/lists/${list.list.id}`)).status()).toBe(404);
  expect((await otherPage.request.delete(`/api/me/lists/${list.list.id}`)).status()).toBe(404);
  await other.close();
});
