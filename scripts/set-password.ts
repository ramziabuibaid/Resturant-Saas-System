/**
 * تغيير كلمة مرور أي مستخدم من سطر الأوامر (بديل «نسيت كلمة المرور» حالياً).
 *
 *   npm run user:password -- admin@resturant.app
 *   npm run user:password -- demo --restaurant demo
 *
 * تُطلب كلمة المرور الجديدة بشكل مخفي، وتُنهى كل جلسات المستخدم.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/auth/password";

function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const [who, flag, sub] = process.argv.slice(2);
  if (!who) throw new Error("الاستعمال: npm run user:password -- <email|username> [--restaurant <subdomain>]");

  let where;
  if (who.includes("@")) {
    where = eq(schema.users.email, who.toLowerCase());
  } else if (flag === "--restaurant" && sub) {
    const [r] = await db.select({ id: schema.restaurants.id }).from(schema.restaurants).where(eq(schema.restaurants.subdomain, sub)).limit(1);
    if (!r) throw new Error(`لا يوجد مطعم بالنطاق ${sub}`);
    where = and(eq(schema.users.username, who.toLowerCase()), eq(schema.users.restaurantId, r.id));
  } else {
    where = and(eq(schema.users.username, who.toLowerCase()), isNull(schema.users.restaurantId));
  }

  const [user] = await db.select().from(schema.users).where(where).limit(1);
  if (!user) throw new Error("المستخدم غير موجود");

  const pw = await askHidden("كلمة المرور الجديدة: ");
  if (pw.length < MIN_PASSWORD_LENGTH) throw new Error(`كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل`);
  if ((await askHidden("أعد كتابتها: ")) !== pw) throw new Error("كلمتا المرور غير متطابقتين");

  await db.update(schema.users).set({ passwordHash: await hashPassword(pw) }).where(eq(schema.users.id, user.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  console.log(`✓ تم تغيير كلمة مرور ${user.email ?? user.username}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
