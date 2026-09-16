import path from "path";
import { defineConfig } from "vitest/config";

// Config própria: o vite.config.ts exige PORT e BASE_PATH, que os testes não usam.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
