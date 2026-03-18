"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message || "فشل تحديث كلمة المرور");
      return;
    }

    // بعد النجاح: المستخدم غالباً يكون لسه مسجل دخول بسبب recovery token
    router.replace("/login");
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">تعيين كلمة مرور جديدة</h1>
          <p className="text-sm text-muted-foreground">
            أدخل كلمة مرور جديدة لتكملة عملية إعادة ضبط كلمة المرور.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password-confirm">تأكيد كلمة المرور</Label>
            <Input
              id="new-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الحفظ…" : "حفظ كلمة المرور"}
          </Button>
        </form>
      </div>
    </div>
  );
}

