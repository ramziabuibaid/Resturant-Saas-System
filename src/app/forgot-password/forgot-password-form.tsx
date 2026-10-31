"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheckIcon, MessageCircleIcon } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { authButtonCls, authInputCls } from "@/components/auth/auth-shell";
import { AuthError } from "@/components/auth/password-input";

export function ForgotPasswordForm({ supportUrl }: { supportUrl: string | null }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await requestPasswordReset(email);
    setLoading(false);
    if (res.error) setError(res.error);
    else setSent(true);
  }

  const support = supportUrl ? (
    <a
      href={supportUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong text-sm font-semibold text-text-secondary transition hover:bg-bg-surface-2"
    >
      <MessageCircleIcon className="size-4 text-[#25d366]" />
      أو تواصل معنا مباشرة على واتساب
    </a>
  ) : null;

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <MailCheckIcon className="mx-auto size-9 text-emerald-600" />
          <p className="mt-3 font-bold">تحقق من بريدك</p>
          <p className="mt-1 text-sm text-text-secondary">
            إن كان <span dir="ltr" className="font-semibold">{email.trim()}</span> مسجّلاً لدينا فستصلك رسالة خلال دقائق. تحقق من
            مجلد الرسائل غير المرغوب فيها أيضاً.
          </p>
        </div>
        {support}
        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        </label>
        {error ? <AuthError>{error}</AuthError> : null}
        <button type="submit" disabled={loading} className={authButtonCls}>
          {loading ? "جارٍ الإرسال…" : "أرسل رابط الاستعادة"}
        </button>
      </form>
      {support}
      <p className="text-center text-sm text-text-muted">
        تذكرتها؟{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
