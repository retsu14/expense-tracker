import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/infrastructure/*.schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
