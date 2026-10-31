"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { authButtonCls, authInputCls } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { AuthError, PasswordInput } from "@/components/auth/password-input";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signUp({ email, password, fullName });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/complete-profile");
  }

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <GoogleButton label="التسجيل عبر Google" />
          <AuthDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">
            اسمك <span className="font-normal text-text-muted">(اختياري)</span>
          </span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: أحمد"
            autoComplete="name"
            maxLength={80}
            disabled={loading}
            className={authInputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            disabled={loading}
            dir="ltr"
            className={authInputCls}
          />
          <span className="block text-xs text-text-muted">تدخل به إلى لوحة مطعمك، ونرسل عليه رسالة الترحيب.</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">كلمة المرور</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="8 أحرف على الأقل" disabled={loading} />
        </label>
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={loading} className={authButtonCls}>
          {loading ? "جارٍ إنشاء الحساب…" : "التالي: بيانات المطعم"}
        </button>
      </form>

      <p className="text-center text-sm text-text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
