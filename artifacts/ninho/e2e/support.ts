import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "SenhaDeTeste2026!";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@teste.local`;
}

/** Data ISO (AAAA-MM-DD) relativa a hoje, no fuso local. */
export function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * IP de origem único por conta. A API só confia no X-Forwarded-For vindo do
 * proxy local (o Vite, neste caso), então cada conta de teste conta como um
 * visitante diferente e o limite de cadastros por IP não interfere.
 */
function randomClientIp(): string {
  const n = () => Math.floor(Math.random() * 250) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

export type TestAccount = { email: string; displayName: string };

/** Cria uma conta pela API, já com o onboarding feito, e deixa a sessão no navegador. */
export async function createAccount(
  page: Page,
  { displayName = "Ana", dueDate = isoDaysFromToday(100) }: { displayName?: string; dueDate?: string | null } = {},
): Promise<TestAccount> {
  const email = uniqueEmail("conta");
  const register = await page.request.post("/api/auth/register", {
    data: { email, password: PASSWORD },
    headers: { "x-forwarded-for": randomClientIp() },
  });
  expect(register.status(), await register.text()).toBe(201);

  const workspace = await page.request.get("/api/me/workspace");
  expect(workspace.ok()).toBe(true);

  const profile = await page.request.put("/api/me/profile", {
    data: { displayName, dueDate, onboardingComplete: true },
  });
  expect(profile.ok()).toBe(true);
  return { email, displayName };
}

/** Linha da lista pelo nome do item. */
export function itemRow(page: Page, name: string) {
  return page.locator(".check-item-row", { has: page.getByText(name, { exact: true }) });
}

/** Sem violações sérias ou críticas de WCAG 2.2 A/AA. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const relevant = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(relevant, `axe em ${page.url()}`).toEqual([]);
}
