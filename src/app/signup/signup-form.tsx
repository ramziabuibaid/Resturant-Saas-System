"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPlaceholderEmail } from "@/lib/placeholder-email";
import { createProfileAfterSignup } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const raw = username.trim().toLowerCase();
    if (raw.length < 3) {
      setError("اسم المستخدم 3 أحرف على الأقل");
      setLoading(false);
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(raw)) {
      setError("اسم المستخدم: حروف إنجليزية صغيرة، أرقام، شرطة أو شرطة سفلية فقط");
      setLoading(false);
      return;
    }

    const email = getPlaceholderEmail(username);
    const supabase = createClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/complete-profile`,
        data: { username: raw },
      },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    const { error: profileErr } = await createProfileAfterSignup(raw);
    if (profileErr) {
      setError(profileErr);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
    router.refresh();
    router.push("/complete-profile");
  }

  if (success) {
    return (
      <div className="space-y-4 text-center text-sm" dir="rtl">
        <p className="text-green-600">
          تم إنشاء الحساب بنجاح. جاري توجيهك لإنشاء مطعمك…
        </p>
        <Link href="/complete-profile" className={cn(buttonVariants({ variant: "default" }), "w-full inline-flex justify-center")}>
          إنشاء مطعمي الآن
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="username">اسم المستخدم</Label>
        <Input
          id="username"
          type="text"
          placeholder="مثال: ahmad أو مطعم_النخيل"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
          disabled={loading}
          className="text-right"
        />
        <p className="text-xs text-muted-foreground">
          حروف إنجليزية صغيرة، أرقام، شرطة أو شرطة سفلية (3–30 حرفاً). ستستخدمه لتسجيل الدخول إلى لوحة مطعمك.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          disabled={loading}
          className="text-right"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جاري الإنشاء…" : "إنشاء حساب"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="underline hover:text-foreground">
          لديك حساب؟ تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
