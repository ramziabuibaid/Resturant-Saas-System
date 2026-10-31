"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import { authButtonCls, authInputCls } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { AuthError, PasswordInput } from "@/components/auth/password-input";

const ADMIN_TENANT_COOKIE = "admin_subdomain";

/** دخول موحّد: Google أو البريد وكلمة المرور (والحسابات القديمة باسم المستخدم في نفس الحقل) */
export function SignInForm({
  tenant,
  googleEnabled,
  initialError,
}: {
  /** المطعم عند الدخول من نطاقه الفرعي */
  tenant: { id: string; subdomain: string } | null;
  googleEnabled: boolean;
  initialError: string | null;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn(identifier, password, tenant?.id ?? null);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    if (tenant) {
      // يقرأه layout لوحة التحكم إن لم يصل الـ Host صحيحاً بعد التوجيه
      document.cookie = `${ADMIN_TENANT_COOKIE}=${encodeURIComponent(tenant.subdomain)}; path=/; max-age=120; SameSite=Lax`;
    }
    // تحميل كامل حتى يقرأ الخادم كوكي الجلسة الجديد
    window.location.assign(new URL("/admin", window.location.href));
  }

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <GoogleButton />
          <AuthDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">البريد الإلكتروني</span>
          <input
            type="text"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="username"
            disabled={loading}
            dir="ltr"
            className={authInputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="flex items-baseline justify-between">
            <span className="text-sm font-bold">كلمة المرور</span>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" disabled={loading} />
        </label>
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={loading} className={authButtonCls}>
          {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </button>
      </form>

      {tenant ? (
        <p className="text-center text-sm text-text-muted">
          <Link href="/" className="hover:text-text-primary hover:underline">
            العودة لصفحة المطعم
          </Link>
        </p>
      ) : (
        <p className="text-center text-sm text-text-muted">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            أنشئ حساب مطعمك مجاناً
          </Link>
        </p>
      )}
    </div>
  );
}
