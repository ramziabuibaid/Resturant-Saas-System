/**
 * إنشاء حساب مالك نظام أو تحديث كلمة مروره (كلمة المرور تُقرأ من stdin حتى لا تظهر في سجل الأوامر).
 *
 *   printf '%s' 'كلمة المرور' | npx tsx scripts/upsert-super-admin.ts you@example.com
 *
 * على السيرفر:
 *   printf '%s' '…' | docker compose run --rm -T tools npx tsx scripts/upsert-super-admin.ts you@example.com
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/auth/password";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("الاستعمال: … | npx tsx scripts/upsert-super-admin.ts <email>");
  const password = await readStdin();
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل (من stdin)`);

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing && existing.role !== "super_admin") {
    throw new Error("هذا البريد مستخدم لحساب صاحب مطعم — لن يُرقّى تلقائياً");
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    console.log(`✓ حُدّثت كلمة مرور مالك النظام ${email}`);
  } else {
    await db.insert(schema.users).values({ email, passwordHash, role: "super_admin", fullName: "مالك النظام" });
    console.log(`✓ أُنشئ حساب مالك النظام ${email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
