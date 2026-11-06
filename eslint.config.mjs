import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const layer = (type) => ({ type, pattern: `src/modules/*/${type}` });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "drizzle/**", "next-env.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        layer("domain"),
        layer("application"),
        layer("infrastructure"),
        layer("presentation"),
        { type: "kernel", pattern: "src/shared/kernel" },
        { type: "shared", pattern: "src/shared" },
        { type: "app", pattern: "src/app" },
        { type: "ui", pattern: "src/components" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "allow",
          policies: [
            {
              from: { element: { type: "domain" } },
              disallow: {
                to: {
                  element: {
                    types: ["application", "infrastructure", "presentation", "app", "ui", "shared"],
                  },
                },
              },
              message: "Domain must stay pure (kernel only)",
            },
            {
              from: { element: { type: "application" } },
              disallow: {
                to: { element: { types: ["infrastructure", "presentation", "app", "ui"] } },
              },
              message: "Application depends on domain ports, not adapters or UI",
            },
            {
              from: { element: { type: "kernel" } },
              disallow: {
                to: {
                  element: {
                    types: [
                      "domain",
                      "application",
                      "infrastructure",
                      "presentation",
                      "app",
                      "ui",
                      "shared",
                    ],
                  },
                },
              },
              message: "Kernel has no dependencies",
            },
          ],
        },
      ],
    },
  },
]);
