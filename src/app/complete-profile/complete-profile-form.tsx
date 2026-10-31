"use client";

import { useState } from "react";
import { createRestaurantAndLink } from "@/app/actions/auth";
import { authButtonCls, authInputCls } from "@/components/auth/auth-shell";
import { MENU_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type PricingMode = "usd_syp" | "syp" | "other";

const MODES: { id: PricingMode; title: string; hint: string }[] = [
  { id: "usd_syp", title: "بالدولار، ويظهر بالليرة أيضاً", hint: "تحدّث سعر الصرف يومياً فتتحدّث أسعار الليرة كلها" },
  { id: "syp", title: "بالليرة السورية فقط", hint: "تكتب الأسعار بالليرة مباشرة" },
  { id: "other", title: "عملة أخرى", hint: "شيكل، دينار، ريال…" },
];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "resturant.app";

export function CompleteProfileForm() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [mode, setMode] = useState<PricingMode>("usd_syp");
  const [rate, setRate] = useState("");
  const [otherCurrency, setOtherCurrency] = useState("ILS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = Number(rate.replace(/,/g, ""));
    if (mode === "usd_syp" && rate.trim() && !(r > 0)) return setError("سعر الصرف غير صالح");

    setLoading(true);
    const { error: err } = await createRestaurantAndLink({
      name: name.trim(),
      subdomain: subdomain.trim(),
      currencyCode: mode === "usd_syp" ? "USD" : mode === "syp" ? "SYP" : otherCurrency,
      ...(mode === "usd_syp" ? { secondaryCurrencyCode: "SYP", exchangeRate: rate.trim() ? r : null } : {}),
    });
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    // تحميل كامل (وليس router.push) حتى يقرأ الخادم كوكي الجلسة الجديدة
    window.location.assign(new URL("/admin", window.location.href));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">اسم المطعم</span>
        <input
          type="text"
          placeholder="مثال: مطعم الشام"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          disabled={loading}
          className={authInputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">رابط المنيو</span>
        <span
          className="flex h-12 items-center overflow-hidden rounded-xl border border-border bg-bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
          dir="ltr"
        >
          <input
            type="text"
            placeholder="alsham"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            required
            minLength={2}
            maxLength={63}
            disabled={loading}
            className="h-full min-w-0 flex-1 bg-transparent px-4 font-mono text-[15px] outline-none"
          />
          <span className="pe-4 font-mono text-sm text-text-muted">.{ROOT_DOMAIN}</span>
        </span>
        <span className="block text-xs text-text-muted">حروف إنجليزية صغيرة وأرقام — هذا رابط منيو مطعمك ورمز QR.</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-bold">كيف تسعّر أصنافك؟</legend>
        {MODES.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
              mode === m.id ? "border-brand bg-brand-light" : "border-border bg-bg-surface hover:border-border-strong"
            )}
          >
            <input
              type="radio"
              name="pricing"
              checked={mode === m.id}
              onChange={() => setMode(m.id)}
              className="mt-1 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-sm font-bold">{m.title}</span>
              <span className="block text-xs text-text-muted">{m.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === "usd_syp" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">سعر الدولار اليوم</span>
          <span className="flex items-center gap-2" dir="ltr">
            <span className="shrink-0 font-display text-lg font-bold">1 $ =</span>
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^0-9.,]/g, ""))}
              inputMode="decimal"
              placeholder="مثال: 122"
              disabled={loading}
              className={cn(authInputCls, "text-end font-display text-lg font-bold")}
            />
            <span className="shrink-0 font-display text-lg font-bold">ل.س</span>
          </span>
          <span className="block text-xs text-text-muted">بالليرة الجديدة. يمكنك تركه الآن وتحديثه من لوحة التحكم.</span>
        </label>
      ) : mode === "other" ? (
        <select
          value={otherCurrency}
          onChange={(e) => setOtherCurrency(e.target.value)}
          aria-label="العملة"
          className={authInputCls}
        >
          {MENU_CURRENCIES.filter((c) => c.code !== "SYP").map((c) => (
            <option key={c.code} value={c.code}>
              {c.labelAr}
            </option>
          ))}
        </select>
      ) : null}

      {error ? <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p> : null}
      <button type="submit" disabled={loading} className={authButtonCls}>
        {loading ? "جارٍ إنشاء المطعم…" : "أنشئ مطعمي وادخل للوحة التحكم"}
      </button>
    </form>
  );
}
