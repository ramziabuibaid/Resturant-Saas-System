"use client";

import { getOrderTrackingByToken, type PublicOrderTracking } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/types/database";
import { MenuRestaurantBrand } from "@/components/menu-restaurant-brand";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-ui";
import { formatMenuPrice } from "@/lib/currencies";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import { cn } from "@/lib/utils";
import { MenuPublicFooter } from "@/components/menu-public-footer";
import { useEffect, useState } from "react";

const FULFILLMENT_LABELS: Record<string, string> = {
  dine_in: "داخل المطعم",
  pickup: "استلام من المطعم",
  delivery: "توصيل",
};

const TRACK_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: ORDER_STATUS_LABELS.pending },
  { status: "accepted", label: ORDER_STATUS_LABELS.accepted },
  { status: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { status: "ready", label: ORDER_STATUS_LABELS.ready },
  { status: "completed", label: ORDER_STATUS_LABELS.completed },
];

function stepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  const i = TRACK_STEPS.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

function trackingPayloadEqual(a: PublicOrderTracking, b: PublicOrderTracking): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const POLL_MS = 6000;

type Props = {
  subdomain: string;
  token: string;
  initialData: PublicOrderTracking;
};

export function OrderTrackClient({ subdomain, token, initialData }: Props) {
  const [data, setData] = useState<PublicOrderTracking>(initialData);

  const terminal = data.status === "completed" || data.status === "cancelled";

  useEffect(() => {
    if (terminal) return;

    let cancelled = false;

    const refresh = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const next = await getOrderTrackingByToken(subdomain, token);
      if (cancelled || !next) return;
      setData((prev) => (trackingPayloadEqual(prev, next) ? prev : next));
    };

    const id = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [subdomain, token, terminal]);

  const activeIdx = stepIndex(data.status);
  const cancelled = data.status === "cancelled";

  const rateRaw =
    data.secondary_exchange_rate != null ? Number(data.secondary_exchange_rate) : NaN;
  const showSecondary =
    data.secondary_currency_enabled === true &&
    Boolean(data.secondary_currency_code) &&
    Number.isFinite(rateRaw) &&
    rateRaw > 0;
  const secondaryRate = showSecondary ? rateRaw : NaN;
  const secondaryCurrencyCode = data.secondary_currency_code;

  return (
    <div className="min-h-svh bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 text-stone-900 transition-colors duration-300 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 dark:text-stone-50">
      <header className="border-b border-stone-200/90 bg-gradient-to-b from-white/95 via-stone-50/95 to-stone-100/90 backdrop-blur dark:border-white/5 dark:from-stone-950/80 dark:via-stone-950/90 dark:to-stone-900/90">
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-6 sm:pb-8">
          <MenuRestaurantBrand
            logoUrl={data.logo_url}
            name={data.restaurant_name}
            menuTitleAnimationEnabled={data.menu_title_animation_enabled}
          />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="font-mono text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
            طلب{" "}
            <span dir="ltr" className="tabular-nums">
              #{data.display_number}
            </span>
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400" dir="rtl">
            تم الإنشاء{" "}
            {new Date(data.created_at).toLocaleString("ar-SA", {
              dateStyle: "medium",
              timeStyle: "short",
              numberingSystem: "latn",
            })}
          </p>
          {!terminal ? (
            <p
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
              aria-live="polite"
            >
              <span
                className="relative flex size-2 shrink-0"
                aria-hidden
              >
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              يتحدّث تلقائياً كل بضع ثوانٍ
            </p>
          ) : null}
        </div>

        <section
          className="mb-8 rounded-2xl border border-stone-200/90 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-stone-900/60"
          aria-labelledby="order-details-heading"
        >
          <h3
            id="order-details-heading"
            className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100"
          >
            تفاصيل الطلب
          </h3>
          <dl className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
            <div className="flex flex-wrap justify-between gap-2 border-b border-stone-200/80 pb-2 dark:border-stone-700/80">
              <dt className="text-stone-500 dark:text-stone-400">حالة الطلب</dt>
              <dd className="font-medium">{ORDER_STATUS_LABELS[data.status]}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-stone-200/80 pb-2 dark:border-stone-700/80">
              <dt className="text-stone-500 dark:text-stone-400">نوع الطلب</dt>
              <dd className="font-medium">
                {FULFILLMENT_LABELS[data.fulfillment] ?? data.fulfillment}
              </dd>
            </div>
            {data.table_label ? (
              <div className="flex flex-wrap justify-between gap-2 border-b border-stone-200/80 pb-2 dark:border-stone-700/80">
                <dt className="text-stone-500 dark:text-stone-400">الطاولة</dt>
                <dd className="font-medium">{data.table_label}</dd>
              </div>
            ) : null}
            {data.delivery_address ? (
              <div className="border-b border-stone-200/80 pb-2 dark:border-stone-700/80">
                <dt className="text-stone-500 dark:text-stone-400">عنوان التوصيل</dt>
                <dd className="mt-1 font-medium leading-relaxed">{data.delivery_address}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2 border-b border-stone-200/80 pb-2 dark:border-stone-700/80">
              <dt className="text-stone-500 dark:text-stone-400">رقم الجوال</dt>
              <dd dir="ltr" className="font-mono font-medium tabular-nums">
                {data.customer_phone}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 space-y-3 border-t border-stone-200/90 pt-4 dark:border-stone-700/80">
            {data.items.map((line) => (
              <li
                key={line.id}
                className="border-b border-stone-100 pb-3 last:border-0 last:pb-0 dark:border-stone-800/80"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 font-medium leading-snug text-stone-900 dark:text-stone-50">
                    {line.menu_item_name}
                    {line.price_option_label ? (
                      <span className="text-stone-600 dark:text-stone-400">
                        {" "}
                        ({line.price_option_label})
                      </span>
                    ) : null}
                    <span className="text-stone-500 dark:text-stone-400"> × {line.quantity}</span>
                  </span>
                  <span
                    dir="ltr"
                    className="flex shrink-0 flex-col items-end gap-0.5 text-end tabular-nums text-stone-700 dark:text-stone-300"
                  >
                    <span>{formatMenuPrice(line.line_total_cents, data.currency_code)}</span>
                    {showSecondary && secondaryCurrencyCode ? (
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        {formatMenuPrice(
                          secondaryCentsFromPrimaryCents(line.line_total_cents, secondaryRate),
                          secondaryCurrencyCode
                        )}
                      </span>
                    ) : null}
                  </span>
                </div>
                {line.excluded_ingredients && line.excluded_ingredients.length > 0 ? (
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                    <span className="font-semibold">بدون: </span>
                    {line.excluded_ingredients.join("، ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-stone-200/90 pt-4 text-sm dark:border-stone-700/80">
            {data.loyalty_discount_cents > 0 || data.owner_discount_cents > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 text-stone-700 dark:text-stone-300">
                  <span>مجموع الأصناف</span>
                  <span dir="ltr" className="tabular-nums">
                    {formatMenuPrice(data.items_subtotal_cents, data.currency_code)}
                  </span>
                </div>
                {data.owner_discount_cents > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-sky-800 dark:text-sky-300/90">
                    <span>خصم من المطعم</span>
                    <span dir="ltr" className="tabular-nums">
                      −{formatMenuPrice(data.owner_discount_cents, data.currency_code)}
                    </span>
                  </div>
                ) : null}
                {data.loyalty_discount_cents > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-300/90">
                    <span>
                      خصم نقاط الولاء
                      {data.loyalty_points_used > 0 ? (
                        <span className="ms-1 tabular-nums" dir="ltr">
                          ({data.loyalty_points_used} نقطة)
                        </span>
                      ) : null}
                    </span>
                    <span dir="ltr" className="tabular-nums">
                      −{formatMenuPrice(data.loyalty_discount_cents, data.currency_code)}
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex items-center justify-between gap-2 font-semibold text-stone-900 dark:text-stone-50">
              <span>
                {data.loyalty_discount_cents > 0 || data.owner_discount_cents > 0
                  ? "المستحق"
                  : "الإجمالي"}
              </span>
              <div dir="ltr" className="flex flex-col items-end gap-0.5 text-end">
                <span className="text-lg font-bold tabular-nums">
                  {formatMenuPrice(data.total_cents, data.currency_code)}
                </span>
                {showSecondary && secondaryCurrencyCode ? (
                  <span className="text-sm font-medium tabular-nums text-stone-600 dark:text-stone-400">
                    {formatMenuPrice(
                      secondaryCentsFromPrimaryCents(data.total_cents, secondaryRate),
                      secondaryCurrencyCode
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {data.loyalty_points_earned_on_order > 0 ? (
            <div
              className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-center dark:border-emerald-500/25 dark:bg-emerald-950/40"
              role="status"
            >
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                <span dir="ltr" className="tabular-nums">
                  +{data.loyalty_points_earned_on_order}
                </span>{" "}
                نقطة مكتسبة من هذا الطلب ضمن برنامج الولاء
              </p>
              <p className="mt-1 text-[11px] text-emerald-800/90 dark:text-emerald-200/80">
                تمت إضافة النقاط إلى رصيدك المرتبط بهذا الجوال بعد اكتمال الطلب.
              </p>
            </div>
          ) : null}
        </section>

        {cancelled ? (
          <div className="rounded-2xl border border-red-500/45 bg-red-950/30 px-4 py-6 text-center dark:bg-red-950/30">
            <p className="text-lg font-semibold text-red-800 dark:text-red-100">
              {ORDER_STATUS_LABELS.cancelled}
            </p>
            <p className="mt-2 text-sm text-red-700/90 dark:text-red-200/90">
              لم يعد هذا الطلب نشطاً.
            </p>
          </div>
        ) : (
          <ol className="relative me-2 space-y-0 border-s-2 border-stone-300 ps-6 dark:border-stone-700">
            {TRACK_STEPS.map((step, i) => {
              const done = i < activeIdx;
              const current = i === activeIdx;
              return (
                <li key={step.status} className="relative pb-8 last:pb-0">
                  <span
                    className={cn(
                      "absolute -start-[21px] top-0 flex size-4 shrink-0 rounded-full border-2 border-stone-400 dark:border-stone-800",
                      done && "bg-emerald-500",
                      current && !done && "scale-110 bg-amber-400 ring-4 ring-amber-400/30",
                      !done && !current && "bg-stone-400 dark:bg-stone-700"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      current
                        ? "border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/40"
                        : done
                          ? "border-emerald-600/40 bg-emerald-500/10 dark:bg-emerald-950/20"
                          : "border-stone-200 bg-stone-100/80 opacity-90 dark:border-stone-800 dark:bg-stone-900/50 dark:opacity-70"
                    )}
                  >
                    <p className="font-semibold text-stone-900 dark:text-stone-50">{step.label}</p>
                    {current ? (
                      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                        الحالة الحالية لطلبك
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-10 text-center text-xs text-stone-500 dark:text-stone-500">
          هذه الصفحة للاطلاع فقط. للاستفسار تواصل مع المطعم مباشرة.
        </p>
      </div>

      <MenuPublicFooter
        variant="track"
        restaurantName={data.restaurant_name}
        footerNote={data.footer_note}
        publicAddress={data.public_address}
        publicMapsUrl={data.public_maps_url}
        publicPhone1={data.public_phone_1}
        publicPhone2={data.public_phone_2}
        publicPhone3={data.public_phone_3}
        socialFacebookUrl={data.social_facebook_url}
        socialInstagramUrl={data.social_instagram_url}
        socialTiktokUrl={data.social_tiktok_url}
      />
    </div>
  );
}
