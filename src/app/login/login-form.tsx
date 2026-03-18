"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * تسجيل دخول لوحة إدارة النظام (Super Admin فقط).
 * يستخدم البريد الإلكتروني وكلمة المرور.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
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
          autoComplete="current-password"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جاري الدخول…" : "تسجيل الدخول"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={() => {
          window.location.href = "/login?mode=username";
        }}
      >
        تسجيل الدخول عبر اسم المستخدم
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="underline hover:text-foreground">
          العودة للرئيسية
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground border-t pt-3 mt-3">
        صاحب مطعم؟ ادخل من رابط مطعمك (مثل: نطاق-مطعمك.yourdomain.com/login) باسم المستخدم وكلمة المرور.
      </p>
    </form>
  );
}
