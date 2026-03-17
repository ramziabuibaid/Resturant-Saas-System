import { createClient } from "@supabase/supabase-js";
import { ensureEnvLoaded } from "@/lib/load-env";

/**
 * Supabase client with Service Role Key — للاستخدام في السيرفر فقط.
 * يسمح بإنشاء مستخدمين وتعديل كلمات المرور (Admin API).
 * لا تعرّض هذا المفتاح في العميل أبداً.
 */
export function createAdminClient() {
  ensureEnvLoaded();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY in .env.local for creating owner accounts."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
