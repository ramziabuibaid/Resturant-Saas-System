"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/complete-profile` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="space-y-4 text-center text-sm" dir="rtl">
        <p className="text-green-600">
          تم إنشاء الحساب. إن كان المشروع يتطلب تأكيد البريد، راجع بريدك ثم سجّل الدخول.
        </p>
        <p className="text-muted-foreground">
          بعد تسجيل الدخول ستُنشئ مطعمك أو تربط حسابك بمطعم موجود، وتحصل على أول شهر مجاناً دون إدخال بطاقة بنكية.
        </p>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full inline-flex justify-center")}>
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
          className="text-right"
        />
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
