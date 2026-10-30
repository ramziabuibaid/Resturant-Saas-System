import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * اتصال واحد مشترك بقاعدة البيانات (للخادم فقط — لا تستورده في مكوّن "use client").
 *
 * يُنشأ عند أول استعلام وليس عند الاستيراد: أثناء `next build` (داخل Docker) لا يوجد DATABASE_URL،
 * والبناء يستورد كل الملفات. في التطوير نحفظه على globalThis حتى لا يفتح Hot Reload اتصالات جديدة.
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { db?: DrizzleDb };

function createDb(): DrizzleDb {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL غير مضبوط (انظر .env.example)");
  const client = postgres(url, { max: 10, idle_timeout: 30, prepare: true });
  return drizzle(client, { schema, casing: "snake_case" });
}

function getDb(): DrizzleDb {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Db = DrizzleDb;
export { schema };
