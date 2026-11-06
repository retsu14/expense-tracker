import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "@/shared/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createDb() {
  let pool = globalForDb.pool;
  if (!pool) {
    pool = new Pool({ connectionString: env().DATABASE_URL, idleTimeoutMillis: 30_000 });
    // idle sockets can drop; without a listener Node treats the event as fatal
    pool.on("error", (e: Error) => {
      console.error("[db] idle client error:", e.message);
    });
  }
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
