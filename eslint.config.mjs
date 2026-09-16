// ESLint do monorepo (Fase 3, A12): TypeScript, hooks do React e acessibilidade.
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.tsbuildinfo",
      "**/playwright-report/**",
      "**/test-results/**",
      "attached_assets/**",
      // Gerado pelo Orval a partir do OpenAPI.
      "lib/api-client-react/src/generated/**",
      "lib/api-zod/src/generated/**",
      // Protótipos do Replit e componentes shadcn copiados: fora do app.
      "artifacts/mockup-sandbox/**",
      "artifacts/ninho/src/components/ui/**",
      // Hooks do shadcn, usados só pelos componentes acima (saem no T5 da Fase 3).
      "artifacts/ninho/src/hooks/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    files: ["artifacts/ninho/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
);
