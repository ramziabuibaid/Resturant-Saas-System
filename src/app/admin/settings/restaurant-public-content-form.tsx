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
  initialSecondaryCurrencyEnabled?: boolean;
  initialSecondaryCurrencyCode?: string | null;
  /** وحدات العملة الثانية لكل 1 وحدة أساسية */
  initialSecondaryExchangeRate?: number | null;
  initialMenuTitleAnimationEnabled?: boolean;
  initialMenuBannerUrl?: string | null;
  initialMenuBannerKind?: "image" | "video" | null;
  initialMenuBannerCaption?: string | null;
  initialPublicAddress?: string | null;
  initialPublicMapsUrl?: string | null;
  initialPublicPhone1?: string | null;
  initialPublicPhone2?: string | null;
  initialPublicPhone3?: string | null;
  initialSocialFacebookUrl?: string | null;
  initialSocialInstagramUrl?: string | null;
  initialSocialTiktokUrl?: string | null;
};

export function RestaurantPublicContentForm({
  restaurantId,
  initialHeadline,
  initialSubheadline,
  initialHeroBackgroundUrl,
  initialFooterNote,
  initialCurrencyCode,
  initialSecondaryCurrencyEnabled = false,
  initialSecondaryCurrencyCode = null,
  initialSecondaryExchangeRate = null,
  initialMenuTitleAnimationEnabled = false,
  initialMenuBannerUrl = null,
  initialMenuBannerKind = null,
  initialMenuBannerCaption = null,
  initialPublicAddress = null,
  initialPublicMapsUrl = null,
  initialPublicPhone1 = null,
  initialPublicPhone2 = null,
  initialPublicPhone3 = null,
  initialSocialFacebookUrl = null,
  initialSocialInstagramUrl = null,
  initialSocialTiktokUrl = null,
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
  const [secondaryCurrencyEnabled, setSecondaryCurrencyEnabled] = useState(
    initialSecondaryCurrencyEnabled
  );
  const [secondaryCurrencyCode, setSecondaryCurrencyCode] = useState(
    initialSecondaryCurrencyCode ?? "USD"
  );
  const [secondaryExchangeRateInput, setSecondaryExchangeRateInput] = useState(
    () =>
      initialSecondaryExchangeRate != null &&
      Number.isFinite(Number(initialSecondaryExchangeRate))
        ? String(initialSecondaryExchangeRate)
        : ""
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
  const [publicAddress, setPublicAddress] = useState(
    initialPublicAddress ?? ""
  );
  const [publicMapsUrl, setPublicMapsUrl] = useState(
    initialPublicMapsUrl ?? ""
  );
  const [publicPhone1, setPublicPhone1] = useState(initialPublicPhone1 ?? "");
  const [publicPhone2, setPublicPhone2] = useState(initialPublicPhone2 ?? "");
  const [publicPhone3, setPublicPhone3] = useState(initialPublicPhone3 ?? "");
  const [socialFacebookUrl, setSocialFacebookUrl] = useState(
    initialSocialFacebookUrl ?? ""
  );
  const [socialInstagramUrl, setSocialInstagramUrl] = useState(
    initialSocialInstagramUrl ?? ""
  );
  const [socialTiktokUrl, setSocialTiktokUrl] = useState(
    initialSocialTiktokUrl ?? ""
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

  const secondaryCurrencyOptions = MENU_CURRENCIES.filter(
    (c) => c.code !== currencyCode
  );
  const effectiveSecondaryCurrencyCode =
    secondaryCurrencyOptions.some((c) => c.code === secondaryCurrencyCode)
      ? secondaryCurrencyCode
      : (secondaryCurrencyOptions[0]?.code ?? "USD");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    let secondaryRate: number | null = null;
    if (secondaryCurrencyEnabled) {
      const parsed = parseFloat(secondaryExchangeRateInput.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setLoading(false);
        setError(
          "أدخل سعر صرف صحيحاً (أكبر من صفر): عدد وحدات العملة الثانية لكل 1 وحدة من العملة الأساسية."
        );
        return;
      }
      secondaryRate = parsed;
    }

    const result = await updateRestaurantPublicContent(restaurantId, {
      headline: headline.trim() || null,
      subheadline: subheadline.trim() || null,
      hero_background_url: heroBackgroundUrl.trim() || null,
      footer_note: footerNote.trim() || null,
      public_address: publicAddress.trim() || null,
      public_maps_url: publicMapsUrl.trim() || null,
      public_phone_1: publicPhone1.trim() || null,
      public_phone_2: publicPhone2.trim() || null,
      public_phone_3: publicPhone3.trim() || null,
      social_facebook_url: socialFacebookUrl.trim() || null,
      social_instagram_url: socialInstagramUrl.trim() || null,
      social_tiktok_url: socialTiktokUrl.trim() || null,
      currency_code: currencyCode || null,
      secondary_currency_enabled: secondaryCurrencyEnabled,
      secondary_currency_code: secondaryCurrencyEnabled
        ? effectiveSecondaryCurrencyCode || null
        : null,
      secondary_currency_exchange_rate: secondaryCurrencyEnabled ? secondaryRate : null,
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

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="space-y-1">
          <Label className="text-base">العنوان والاتصال (الفوتر العام)</Label>
          <p className="text-xs text-muted-foreground">
            يظهر في أسفل صفحة المنيو وصفحة تتبع الطلب. اترك الحقول فارغة لإخفائها —
            يُعرض ما تم إدخاله فقط (حتى ثلاثة أرقام).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-address">عنوان المطعم (اختياري)</Label>
          <Textarea
            id="public-address"
            value={publicAddress}
            onChange={(e) => setPublicAddress(e.target.value)}
            rows={2}
            placeholder="الحي، الشارع، المدينة…"
            disabled={loading}
            dir="auto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-maps-url">الموقع على الخريطة — Google Maps (اختياري)</Label>
          <Input
            id="public-maps-url"
            type="url"
            inputMode="url"
            value={publicMapsUrl}
            onChange={(e) => setPublicMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/… أو maps.app.goo.gl/…"
            disabled={loading}
            dir="ltr"
            className="text-start"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            الصق رابط الموقع من تطبيق خرائط Google. عند التعبئة، يصبح نص العنوان في فوتر
            المنيو وصفحة التتبع رابطاً يفتح الموقع على الخريطة.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="public-phone-1">هاتف 1</Label>
            <Input
              id="public-phone-1"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={publicPhone1}
              onChange={(e) => setPublicPhone1(e.target.value)}
              placeholder="+966…"
              disabled={loading}
              dir="ltr"
              className="text-start"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-phone-2">هاتف 2</Label>
            <Input
              id="public-phone-2"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={publicPhone2}
              onChange={(e) => setPublicPhone2(e.target.value)}
              placeholder="اختياري"
              disabled={loading}
              dir="ltr"
              className="text-start"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-phone-3">هاتف 3</Label>
            <Input
              id="public-phone-3"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={publicPhone3}
              onChange={(e) => setPublicPhone3(e.target.value)}
              placeholder="اختياري"
              disabled={loading}
              dir="ltr"
              className="text-start"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="space-y-1">
          <Label className="text-base">وسائل التواصل</Label>
          <p className="text-xs text-muted-foreground">
            فيسبوك وإنستغرام وتيك توك. تُعرض أيقونة المنصّة في فوتر المنيو وصفحة تتبع الطلب
            فقط عند إدخال رابط. يمكنك لصق الرابط كاملاً أو بدون https://.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="social-facebook">فيسبوك</Label>
          <Input
            id="social-facebook"
            type="url"
            inputMode="url"
            value={socialFacebookUrl}
            onChange={(e) => setSocialFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/…"
            disabled={loading}
            dir="ltr"
            className="text-start"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="social-instagram">إنستغرام</Label>
          <Input
            id="social-instagram"
            type="url"
            inputMode="url"
            value={socialInstagramUrl}
            onChange={(e) => setSocialInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/…"
            disabled={loading}
            dir="ltr"
            className="text-start"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="social-tiktok">تيك توك</Label>
          <Input
            id="social-tiktok"
            type="url"
            inputMode="url"
            value={socialTiktokUrl}
            onChange={(e) => setSocialTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@…"
            disabled={loading}
            dir="ltr"
            className="text-start"
            autoComplete="off"
          />
        </div>
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

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="secondary-currency-enabled" className="text-base">
              تفعيل عملة ثانية في المنيو
            </Label>
            <p className="text-xs text-muted-foreground">
              عند التفعيل سيظهر السعر الأساسي ثم السعر بالعملة الثانية أسفله. عيّن سعر
              الصرف لاحتساب السعر الثاني تلقائياً عند عدم إدخاله يدوياً للصنف.
            </p>
          </div>
          <Switch
            id="secondary-currency-enabled"
            checked={secondaryCurrencyEnabled}
            onCheckedChange={setSecondaryCurrencyEnabled}
            disabled={loading}
            aria-label="تفعيل عرض عملة ثانية"
            className="shrink-0 sm:ms-4"
          />
        </div>

        {secondaryCurrencyEnabled ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="secondary-currency">العملة الثانية</Label>
              <select
                id="secondary-currency"
                value={effectiveSecondaryCurrencyCode}
                onChange={(e) => setSecondaryCurrencyCode(e.target.value)}
                disabled={loading}
                className={cn(
                  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {secondaryCurrencyOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.labelAr} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondary-exchange-rate">سعر الصرف</Label>
              <Input
                id="secondary-exchange-rate"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={secondaryExchangeRateInput}
                onChange={(e) => setSecondaryExchangeRateInput(e.target.value)}
                placeholder="مثال: 3.7"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                عدد وحدات {MENU_CURRENCIES.find((c) => c.code === effectiveSecondaryCurrencyCode)?.labelAr ?? "العملة الثانية"} مقابل 1 وحدة من عملة المنيو الأساسية ({currencyCode}). يُستخدم لحساب الأسعار الثانوية تلقائياً عند تركها فارغة في الأصناف.
              </p>
            </div>
          </>
        ) : null}
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

