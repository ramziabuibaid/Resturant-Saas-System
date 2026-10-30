import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * اتصال واحد مشترك بقاعدة البيانات (للخادم فقط — لا تستورده في مكوّن "use client").
 * في التطوير نحفظه على globalThis حتى لا يفتح Hot Reload اتصالات جديدة في كل تعديل.
 */
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL غير مضبوط (انظر .env.example)");
  return postgres(url, { max: 10, idle_timeout: 30, prepare: true });
}

const client = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
