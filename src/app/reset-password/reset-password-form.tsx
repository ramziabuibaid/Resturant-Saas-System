"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { authButtonCls } from "@/components/auth/auth-shell";
import { AuthError, PasswordInput } from "@/components/auth/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setLoading(true);
    const res = await resetPassword(token, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">كلمة المرور الجديدة</span>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="8 أحرف على الأقل" disabled={loading} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">تأكيد كلمة المرور</span>
        <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" disabled={loading} />
      </label>
      {error ? (
        <AuthError>
          {error}{" "}
          {error.includes("رابطاً جديداً") ? (
            <Link href="/forgot-password" className="underline">
              اطلبه هنا
            </Link>
          ) : null}
        </AuthError>
      ) : null}
      <button type="submit" disabled={loading} className={authButtonCls}>
        {loading ? "جارٍ الحفظ…" : "حفظ والدخول"}
      </button>
    </form>
  );
}
