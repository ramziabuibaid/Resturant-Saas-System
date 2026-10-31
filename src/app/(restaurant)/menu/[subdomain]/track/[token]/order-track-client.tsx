"use client";

import { getOrderTrackingByToken, type PublicOrderTracking } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/types/database";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BellRingIcon, CheckIcon, ChefHatIcon, GiftIcon, PartyPopperIcon, ReceiptIcon } from "lucide-react";
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

  const STEP_ICONS = [ReceiptIcon, CheckIcon, ChefHatIcon, BellRingIcon, PartyPopperIcon];
  const headline = cancelled
    ? "تم إلغاء الطلب"
    : data.status === "completed"
      ? "بالهناء والشفاء!"
      : data.status === "ready"
        ? "طلبك جاهز"
        : data.status === "preparing"
          ? "طلبك قيد التحضير"
          : data.status === "accepted"
            ? "المطعم قبل طلبك"
            : "وصل طلبك إلى المطعم";

  return (
    <div className="min-h-svh bg-bg-base text-text-primary" dir="rtl">
      <div className="mx-auto max-w-lg px-4 pb-10 pt-6">
        <header className="flex items-center gap-3">
          {data.logo_url ? (
            <span className="relative size-11 overflow-hidden rounded-2xl border border-border bg-bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.logo_url} alt="" className="size-full object-cover" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{data.restaurant_name}</p>
            <p className="text-xs text-text-muted">تتبع الطلب</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="mt-6 rounded-[26px] border border-border bg-bg-surface p-6 text-center">
          <p className="text-sm font-semibold text-text-muted">طلب رقم</p>
          <p className="font-display text-6xl font-bold tabular-nums text-brand" dir="ltr">
            #{data.display_number}
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold">{headline}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {FULFILLMENT_LABELS[data.fulfillment] ?? data.fulfillment}
            {data.table_label ? ` · ${data.table_label}` : ""}
          </p>
          {!terminal ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bg-surface-2 px-3 py-1 text-xs text-text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-brand" /> تتحدث الحالة تلقائياً
            </p>
          ) : null}

          {cancelled ? (
            <p className="mt-6 rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
              تواصل مع المطعم للاستفسار عن سبب الإلغاء.
            </p>
          ) : (
            <ol className="mt-7 flex items-start justify-between">
              {TRACK_STEPS.map((step, i) => {
                const Icon = STEP_ICONS[i];
                const done = i < activeIdx;
                const current = i === activeIdx;
                return (
                  <li key={step.status} className="relative flex flex-1 flex-col items-center gap-2">
                    {i > 0 ? (
                      <span
                        className={cn("absolute end-1/2 top-5 h-0.5 w-full -translate-y-1/2", i <= activeIdx ? "bg-brand" : "bg-border")}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition",
                        current
                          ? "border-brand bg-brand text-white shadow-[0_0_0_6px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
                          : done
                            ? "border-brand bg-brand-light text-brand"
                            : "border-border bg-bg-surface text-text-muted"
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className={cn("text-[11px] font-semibold", current ? "text-brand" : done ? "text-text-primary" : "text-text-muted")}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-4 rounded-[26px] border border-border bg-bg-surface p-5">
          <h2 className="font-display text-lg font-bold">تفاصيل الطلب</h2>
          <ul className="mt-3 divide-y divide-border">
            {data.items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-bold text-brand">{it.quantity}×</span> <span className="font-semibold">{it.menu_item_name}</span>
                  {it.price_option_label ? <span className="text-text-muted"> · {it.price_option_label}</span> : null}
                  {it.excluded_ingredients?.length ? (
                    <span className="block text-xs text-text-muted">بدون: {it.excluded_ingredients.join("، ")}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold" dir="ltr">
                  {formatMenuPrice(it.line_total_cents, data.currency_code)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1.5 border-t border-border pt-3 text-sm">
            {data.loyalty_discount_cents > 0 || data.owner_discount_cents > 0 ? (
              <div className="flex justify-between text-text-secondary">
                <span>المجموع</span>
                <span dir="ltr">{formatMenuPrice(data.items_subtotal_cents, data.currency_code)}</span>
              </div>
            ) : null}
            {data.owner_discount_cents > 0 ? (
              <div className="flex justify-between text-text-secondary">
                <span>خصم</span>
                <span dir="ltr">−{formatMenuPrice(data.owner_discount_cents, data.currency_code)}</span>
              </div>
            ) : null}
            {data.loyalty_discount_cents > 0 ? (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>خصم النقاط ({data.loyalty_points_used})</span>
                <span dir="ltr">−{formatMenuPrice(data.loyalty_discount_cents, data.currency_code)}</span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-bold">المستحق</span>
              <span className="flex flex-col items-end">
                <span className="font-display text-2xl font-bold" dir="ltr">
                  {formatMenuPrice(data.total_cents, data.currency_code)}
                </span>
                {showSecondary && secondaryCurrencyCode ? (
                  <span className="text-xs text-text-muted" dir="ltr">
                    {formatMenuPrice(secondaryCentsFromPrimaryCents(data.total_cents, secondaryRate), secondaryCurrencyCode)}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          {data.loyalty_points_earned_on_order > 0 ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-gold/15 px-3 py-2 text-sm font-semibold">
              <GiftIcon className="size-4 text-gold" /> كسبت {data.loyalty_points_earned_on_order} نقطة ولاء من هذا الطلب
            </p>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs text-text-muted">للاستفسار عن طلبك تواصل مع المطعم مباشرة.</p>
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
