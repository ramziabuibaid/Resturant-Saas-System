"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateRestaurantPublicContent } from "@/app/actions/admin-restaurant";
import {
  uploadRestaurantHeroBackground,
  uploadRestaurantMenuBanner,
} from "@/lib/supabase/storage";
import { MENU_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ImagePlusIcon, Trash2Icon, Video } from "lucide-react";

type Props = {
  restaurantId: string;
  initialHeadline: string | null;
  initialSubheadline: string | null;
  initialHeroBackgroundUrl: string | null;
  initialFooterNote: string | null;
  initialCurrencyCode: string | null;
  initialMenuTitleAnimationEnabled?: boolean;
  initialMenuBannerUrl?: string | null;
  initialMenuBannerKind?: "image" | "video" | null;
  initialMenuBannerCaption?: string | null;
};

export function RestaurantPublicContentForm({
  restaurantId,
  initialHeadline,
  initialSubheadline,
  initialHeroBackgroundUrl,
  initialFooterNote,
  initialCurrencyCode,
  initialMenuTitleAnimationEnabled = false,
  initialMenuBannerUrl = null,
  initialMenuBannerKind = null,
  initialMenuBannerCaption = null,
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
  const [menuTitleAnimationEnabled, setMenuTitleAnimationEnabled] = useState(
    initialMenuTitleAnimationEnabled
  );
  const [menuBannerUrl, setMenuBannerUrl] = useState(initialMenuBannerUrl ?? "");
  const [menuBannerKind, setMenuBannerKind] = useState<
    "image" | "video" | null
  >(initialMenuBannerKind ?? null);
  const [menuBannerCaption, setMenuBannerCaption] = useState(
    initialMenuBannerCaption ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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
      menu_title_animation_enabled: menuTitleAnimationEnabled,
      menu_banner_url: menuBannerUrl.trim() || null,
      menu_banner_kind: menuBannerUrl.trim() ? menuBannerKind : null,
      menu_banner_caption: menuBannerCaption.trim() || null,
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
        <Label>صورة الخلفية العريضة للهيرو (اختياري)</Label>
        <input
          ref={heroFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setHeroError(null);
            setHeroUploading(true);
            const result = await uploadRestaurantHeroBackground(restaurantId, file);
            setHeroUploading(false);
            e.target.value = "";
            if ("error" in result) {
              setHeroError(result.error);
              return;
            }
            setHeroBackgroundUrl(result.url);
          }}
        />
        {heroBackgroundUrl ? (
          <div className="space-y-2">
            <div className="relative h-32 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={heroBackgroundUrl}
                alt="خلفية الهيرو"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                unoptimized
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || heroUploading}
                onClick={() => heroFileInputRef.current?.click()}
                className="gap-1.5"
              >
                <ImagePlusIcon className="size-4" />
                تغيير الصورة
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || heroUploading}
                onClick={() => {
                  setHeroBackgroundUrl("");
                  setHeroError(null);
                }}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
                إزالة الصورة
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading || heroUploading}
              onClick={() => heroFileInputRef.current?.click()}
              className="gap-1.5"
            >
              <ImagePlusIcon className="size-4" />
              {heroUploading ? "جاري الرفع…" : "رفع صورة الخلفية"}
            </Button>
            {heroUploading && (
              <p className="text-xs text-muted-foreground">جاري رفع الصورة…</p>
            )}
          </div>
        )}
        {heroError && <p className="text-sm text-destructive">{heroError}</p>}
        <p className="text-xs text-muted-foreground">
          تظهر هذه الصورة في خلفية الهيرو في صفحة المنيو. يُفضّل صورة أفقية
          عالية الجودة (JPG, PNG, WebP, GIF).
        </p>
      </div>

      <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start gap-2">
          <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <Label>بانر ترويجي في المنيو (اختياري)</Label>
            <p className="text-xs text-muted-foreground">
              صورة أفقية أو فيديو قصير يظهر أسفل ترويسة صفحة المنيو لتعريف الزبائن
              بأصنافكم أو خدماتكم. الصيغ: صورة (JPG, PNG, WebP, GIF) أو فيديو
              (MP4, WebM) — يُفضّل حجم معقول للتحميل السريع على الجوال.
            </p>
          </div>
        </div>
        <input
          ref={bannerFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBannerError(null);
            setBannerUploading(true);
            const result = await uploadRestaurantMenuBanner(restaurantId, file);
            setBannerUploading(false);
            e.target.value = "";
            if ("error" in result) {
              setBannerError(result.error);
              return;
            }
            setMenuBannerUrl(result.url);
            setMenuBannerKind(result.kind);
          }}
        />
        {menuBannerUrl && menuBannerKind ? (
          <div className="space-y-3 pt-1">
            <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-border bg-muted">
              {menuBannerKind === "video" ? (
                <video
                  src={menuBannerUrl}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  src={menuBannerUrl}
                  alt="معاينة البانر"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 640px"
                  unoptimized
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || bannerUploading}
                onClick={() => bannerFileInputRef.current?.click()}
                className="gap-1.5"
              >
                <ImagePlusIcon className="size-4" />
                استبدال الملف
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || bannerUploading}
                onClick={() => {
                  setMenuBannerUrl("");
                  setMenuBannerKind(null);
                  setMenuBannerCaption("");
                  setBannerError(null);
                }}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
                إزالة البانر
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={loading || bannerUploading}
              onClick={() => bannerFileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Video className="size-4" />
              {bannerUploading ? "جاري الرفع…" : "رفع صورة أو فيديو للبانر"}
            </Button>
            {bannerUploading && (
              <p className="text-xs text-muted-foreground">جاري رفع الملف…</p>
            )}
          </div>
        )}
        {bannerError && (
          <p className="text-sm text-destructive">{bannerError}</p>
        )}
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="menu-banner-caption">نص تحت البانر (اختياري)</Label>
          <Textarea
            id="menu-banner-caption"
            value={menuBannerCaption}
            onChange={(e) => setMenuBannerCaption(e.target.value)}
            rows={2}
            placeholder="مثال: عروض اليوم، توصيل مجاني، أو جملة ترحيبية قصيرة."
            disabled={loading}
          />
        </div>
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

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="menu-title-animation" className="text-base">
              تأثير اسم المطعم في المنيو
            </Label>
            <p className="text-xs text-muted-foreground">
              لون مميز مع توهج ووميض خفيف لاسم المطعم في أعلى صفحة المنيو. قد لا
              يناسب كل الأذواق — يمكنك إيقافه في أي وقت.
            </p>
          </div>
          <Switch
            id="menu-title-animation"
            checked={menuTitleAnimationEnabled}
            onCheckedChange={setMenuTitleAnimationEnabled}
            disabled={loading}
            aria-label="تفعيل تأثير اسم المطعم في المنيو"
            className="shrink-0 sm:ms-4"
          />
        </div>
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

