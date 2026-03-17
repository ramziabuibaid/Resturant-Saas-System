"use client";

import { useState } from "react";
import { signInWithUsernamePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_TENANT_COOKIE = "admin_subdomain";
const COOKIE_MAX_AGE = 120; // ثانيتان

type Props = { restaurantId: string; subdomain: string };

export function OwnerLoginForm({ restaurantId, subdomain }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signInWithUsernamePassword(restaurantId, username, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // حفظ النطاق في cookie لقراءته في layout الـ admin (الـ Host قد لا يصل صحيحاً بعد التوجيه)
    document.cookie = `${ADMIN_TENANT_COOKIE}=${encodeURIComponent(subdomain)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    window.location.href = "/admin";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">اسم المستخدم</Label>
        <Input
          id="username"
          type="text"
          placeholder="اسم الدخول"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
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
      <p className="text-center text-xs text-muted-foreground">
        <a href="/" className="underline hover:text-foreground">
          العودة لصفحة المطعم
        </a>
      </p>
    </form>
  );
}
