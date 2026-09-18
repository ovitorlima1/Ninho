import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL, E2E_SESSION_SECRET } from "./e2e/env";

// Portas próprias do E2E; troque por variável se outro projeto já as usar.
const API_PORT = Number(process.env.E2E_API_PORT ?? 8790);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5190);
const repoRoot = path.resolve(import.meta.dirname, "../..");

/**
 * E2E contra a API e o Vite de verdade, num banco só de teste e em portas
 * próprias — não interfere no `pnpm dev` nem nos dados de desenvolvimento.
 * Os servidores sobem a cada execução para zerar os limitadores em memória.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "celular",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @workspace/api-server exec tsx src/index.ts",
      cwd: repoRoot,
      url: `http://localhost:${API_PORT}/api/healthz`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        SESSION_SECRET: E2E_SESSION_SECRET,
        NODE_ENV: "development",
        LOG_LEVEL: "warn",
      },
    },
    {
      command: "pnpm --filter @workspace/ninho exec vite --config vite.config.ts",
      cwd: repoRoot,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(WEB_PORT),
        BASE_PATH: "/",
        API_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
