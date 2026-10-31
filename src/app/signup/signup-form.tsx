"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { signUpOwner } from "@/app/actions/auth";
import { authButtonCls, authInputCls } from "@/components/auth/auth-shell";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = username.trim().toLowerCase();
    if (raw.length < 3) return setError("اسم المستخدم 3 أحرف على الأقل");
    if (!/^[a-z0-9_-]+$/.test(raw)) return setError("اسم المستخدم: حروف إنجليزية صغيرة وأرقام فقط");

    setLoading(true);
    const { error: signUpErr } = await signUpOwner(raw, password);
    if (signUpErr) {
      setError(signUpErr);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/complete-profile");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">اسم المستخدم</span>
        <input
          type="text"
          placeholder="مثال: ahmad"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
          disabled={loading}
          dir="ltr"
          className={authInputCls}
        />
        <span className="block text-xs text-text-muted">حروف إنجليزية صغيرة وأرقام — تدخل به إلى لوحة مطعمك.</span>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">كلمة المرور</span>
        <span className="relative block">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8 أحرف على الأقل"
            disabled={loading}
            dir="ltr"
            className={`${authInputCls} pl-12`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute inset-y-0 left-0 flex w-12 items-center justify-center text-text-muted"
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </span>
      </label>
      {error ? <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p> : null}
      <button type="submit" disabled={loading} className={authButtonCls}>
        {loading ? "جارٍ إنشاء الحساب…" : "التالي: بيانات المطعم"}
      </button>
      <p className="text-center text-sm text-text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
