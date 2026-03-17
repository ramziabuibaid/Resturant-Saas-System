"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateRestaurantPublicContent } from "@/app/actions/admin-restaurant";
import { MENU_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type Props = {
  restaurantId: string;
  initialHeadline: string | null;
  initialSubheadline: string | null;
  initialHeroBackgroundUrl: string | null;
  initialFooterNote: string | null;
  initialCurrencyCode: string | null;
};

export function RestaurantPublicContentForm({
  restaurantId,
  initialHeadline,
  initialSubheadline,
  initialHeroBackgroundUrl,
  initialFooterNote,
  initialCurrencyCode,
}: Props) {
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [subheadline, setSubheadline] = useState(initialSubheadline ?? "");
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState(
    initialHeroBackgroundUrl ?? ""
  );
  const [footerNote, setFooterNote] = useState(initialFooterNote ?? "");
  const [currencyCode, setCurrencyCode] = useState(
    initialCurrencyCode ?? "SAR"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateRestaurantPublicContent(restaurantId, {
      headline: headline.trim() || null,
      subheadline: subheadline.trim() || null,
      hero_background_url: heroBackgroundUrl.trim() || null,
      footer_note: footerNote.trim() || null,
      currency_code: currencyCode || null,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="headline">عنوان رئيسي (الهيرو)</Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="مثال: أشهى المأكولات أمامك الآن"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subheadline">وصف قصير أسفل العنوان</Label>
        <Textarea
          id="subheadline"
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
          rows={3}
          placeholder="عرّف بنفسك للعملاء في جملة أو جملتين."
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-bg">
          رابط صورة الخلفية العريضة (اختياري)
        </Label>
        <Input
          id="hero-bg"
          value={heroBackgroundUrl}
          onChange={(e) => setHeroBackgroundUrl(e.target.value)}
          placeholder="مثال: https://your-bucket.supabase.co/storage/v1/object/public/..."
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          تظهر هذه الصورة في خلفية الهيرو في صفحة المنيو. يفضّل صورة أفقية
          عالية الجودة.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="footer-note">ملاحظة الفوتر</Label>
        <Textarea
          id="footer-note"
          value={footerNote}
          onChange={(e) => setFooterNote(e.target.value)}
          rows={2}
          placeholder="مثال: أوقات العمل، رقم التواصل، أو حقوق النشر."
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="currency">عملة عرض الأسعار في المنيو</Label>
        <select
          id="currency"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          disabled={loading}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {MENU_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.labelAr} ({c.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          تظهر أسعار المنيو للعملاء بالعملة المختارة وشعارها.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">تم حفظ محتوى صفحة المنيو.</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "جاري الحفظ…" : "حفظ التعديلات"}
      </Button>
    </form>
  );
}

