"use client";

import { useState } from "react";
import { createRestaurantAndLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompleteProfileForm() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await createRestaurantAndLink({
      name: name.trim(),
      subdomain: subdomain.trim(),
    });
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.href = "/owner";
  }

  return (
    <div className="space-y-6" dir="rtl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          أنشئ مطعمك واحصل على أول شهر مجاناً — دون إدخال بطاقة بنكية. بعدها يمكنك الاشتراك من لوحة التحكم.
        </p>
        <div className="space-y-2">
          <Label htmlFor="restaurant-name">اسم المطعم</Label>
          <Input
            id="restaurant-name"
            type="text"
            placeholder="مثال: مطعم النخيل"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            disabled={loading}
            className="text-right"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="restaurant-subdomain">النطاق الفرعي (لرابط المنيو)</Label>
          <Input
            id="restaurant-subdomain"
            type="text"
            placeholder="مثال: alnakhil"
            value={subdomain}
            onChange={(e) =>
              setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            required
            minLength={2}
            maxLength={63}
            disabled={loading}
            className="font-mono text-right"
          />
          <p className="text-xs text-muted-foreground">
            حروف إنجليزية صغيرة، أرقام وشرطة فقط. سيكون منيو مطعمك متاحاً على:
            subdomain.yourdomain.com
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "جاري الإنشاء…" : "إنشاء المطعم والدخول للوحة التحكم"}
        </Button>
      </form>
    </div>
  );
}
