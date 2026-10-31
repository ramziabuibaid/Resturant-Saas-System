"use client";

import { usePathname } from "next/navigation";
import { AlertTriangleIcon, ClockIcon, LockIcon } from "lucide-react";
import type { SubscriptionState } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { supportWhatsAppUrl } from "@/lib/app-url";

/** صفحات ميزات «الاحترافية» — تظهر فيها ملاحظة الترقية لخطة الأساسية */
const PRO_PAGES = ["/admin/orders", "/admin/tables", "/admin/customers"];


function days(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوماً`;
}

/** شريط حالة الاشتراك أعلى لوحة المطعم — لا يظهر شيء إن كان كل شيء على ما يرام */
export function SubscriptionBanner({
  state,
  daysLeft,
  planName,
  orderingIncluded,
  restaurantName,
}: {
  state: SubscriptionState;
  daysLeft: number | null;
  planName: string;
  orderingIncluded: boolean;
  restaurantName: string;
}) {
  const pathname = usePathname();

  let tone: "info" | "warn" | "danger" = "info";
  let text: string | null = null;
  let cta = "اشترك الآن";

  if (state === "trial" && daysLeft != null && daysLeft <= 10) {
    tone = daysLeft <= 3 ? "warn" : "info";
    text = daysLeft <= 0 ? "تنتهي تجربتك المجانية اليوم." : `تبقّى ${days(daysLeft)} في تجربتك المجانية.`;
  } else if (state === "grace") {
    tone = "warn";
    const left = Math.max(0, 7 - Math.abs(daysLeft ?? 0));
    text = `انتهى اشتراكك — سيتوقف المنيو عن الزبائن خلال ${days(Math.max(1, left))} إن لم يُجدَّد.`;
    cta = "جدّد الاشتراك";
  } else if (state === "expired") {
    tone = "danger";
    text = "انتهى اشتراكك والمنيو متوقف حالياً عن الزبائن. لوحتك وبياناتك محفوظة.";
    cta = "جدّد الاشتراك";
  } else if (state === "suspended") {
    tone = "danger";
    text = "حساب المطعم موقوف مؤقتاً والمنيو غير متاح للزبائن.";
    cta = "تواصل معنا";
  } else if (state === "active" && !orderingIncluded && PRO_PAGES.some((p) => pathname.startsWith(p))) {
    text = `خطتك (${planName}) لا تشمل الطلب من المنيو ونقاط الولاء — المنيو يظهر للزبائن للعرض فقط.`;
    cta = "الترقية للاحترافية";
  }

  if (!text) return null;
  const href = supportWhatsAppUrl(`مرحباً، بخصوص اشتراك ${restaurantName}`);
  const Icon = tone === "danger" ? LockIcon : tone === "warn" ? AlertTriangleIcon : ClockIcon;

  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center",
        tone === "danger" && "border-red-300/70 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
        tone === "warn" && "border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "info" && "border-brand/25 bg-brand-light text-text-primary"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <p className="flex-1 font-medium">{text}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {cta}
        </a>
      ) : null}
    </div>
  );
}
