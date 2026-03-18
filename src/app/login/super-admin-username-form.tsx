"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInSuperAdminWithUsernamePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Super Admin login using username/password.
 * Requires public.profiles.login_email to be set for the super_admin user.
 */
export function SuperAdminUsernameLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signInSuperAdminWithUsernamePassword(username, password);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">اسم المستخدم</Label>
        <Input
          id="username"
          type="text"
          placeholder="admin"
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
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={() => {
          window.location.href = "/login?mode=email";
        }}
      >
        تسجيل الدخول عبر البريد الإلكتروني
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

