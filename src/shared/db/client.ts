import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "@/shared/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createDb() {
  const pool = globalForDb.pool ?? new Pool({ connectionString: env().DATABASE_URL });
  if (env().NODE_ENV !== "production") globalForDb.pool = pool;
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

let instance: ReturnType<typeof createDb> | undefined;

export function db() {
  instance ??= createDb();
  return instance;
}

export type Db = ReturnType<typeof db>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
