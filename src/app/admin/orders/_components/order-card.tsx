"use client";

import { useSyncExternalStore } from "react";
import type { GuestOrderWithDetails, OrderStatus } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import {
  ORDER_STATUS_LABELS,
  nextOperationalStatus,
  orderStatusBadgeClasses,
  orderStatusCardClasses,
} from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ClockIcon, EllipsisVerticalIcon, GiftIcon, PencilIcon } from "lucide-react";
import { CustomerPhoneActions } from "./customer-phone-actions";
import { OrderThermalPrintButton } from "./order-thermal-print-button";

/** دقيقة الآن (تتجدد كل دقيقة) — null أثناء الرسم على الخادم */
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}
function useTimeAgo(createdAt: string): string {
  const minuteNow = useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000),
    () => null
  );
  const created = new Date(createdAt);
  if (minuteNow == null) return created.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  const minutes = Math.max(0, minuteNow - Math.floor(created.getTime() / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} د`;
  if (minutes < 1440) return `قبل ${Math.round(minutes / 60)} س`;
  return created.toLocaleDateString("ar", { day: "numeric", month: "short" });
}

/** نص زر الخطوة التالية */
const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  accepted: "قبول الطلب",
  preparing: "بدء التحضير",
  ready: "جاهز",
  completed: "تم التسليم",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  dine_in: "داخل المطعم",
  pickup: "استلام",
  delivery: "توصيل",
};

type Props = {
  order: GuestOrderWithDetails;
  currencyCode: string;
  showSecondary: boolean;
  rate: number;
  /** تقريب مبلغ العملة الثانية */
  roundStep?: number;
  secondaryCurrencyCode: string | null;
  updating: boolean;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onOpenDetails: () => void;
  phoneCountryPrefix: string | null;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
  /** تطبيق خصم النقاط من لوحة المالك */
  onOwnerApplyLoyaltyRedeem?: (orderId: string) => void | Promise<void>;
  ownerRedeeming?: boolean;
  /** عند التفعيل: اختيار الويتر المسؤول من البطاقة */
  waitersSystemEnabled?: boolean;
  waitersForFilter?: { id: string; name: string }[];
  onAssignWaiter?: (orderId: string, waiterId: string | null) => void | Promise<void>;
  assigningWaiterOrderId?: string | null;
};

export function OrderCard({
  order: o,
  currencyCode,
  showSecondary,
  rate,
  roundStep = 0,
  secondaryCurrencyCode,
  updating,
  onStatusChange,
  onOpenDetails,
  phoneCountryPrefix,
  subdomain,
  publicBaseUrl,
  restaurantName,
  onOwnerApplyLoyaltyRedeem,
  ownerRedeeming = false,
  waitersSystemEnabled = false,
  waitersForFilter = [],
  onAssignWaiter,
  assigningWaiterOrderId = null,
}: Props) {
  const subtotal = o.items.reduce((s, i) => s + i.line_total_cents, 0);
  const loyaltyDisc = o.loyalty_discount_cents ?? 0;
  const ownerDisc = o.owner_discount_cents ?? 0;
  const payable = Math.max(0, subtotal - loyaltyDisc - ownerDisc);
  const pointsEarnedOnOrder = o.loyalty_points_earned_on_order ?? 0;
  const next = nextOperationalStatus(o.status);
  const previewItems = o.items.slice(0, 3);
  const more = o.items.length - previewItems.length;

  const timeAgo = useTimeAgo(o.created_at);
  const place = o.table_label ?? FULFILLMENT_LABELS[o.fulfillment] ?? o.fulfillment;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-s-4 border-border bg-bg-surface p-4 transition hover:shadow-md",
        orderStatusCardClasses(o.status)
      )}
    >
      {/* الرأس: الرقم، الحالة، المكان، الوقت */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold tabular-nums" dir="ltr">
              #{o.display_number}
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", orderStatusBadgeClasses(o.status))}>
              {ORDER_STATUS_LABELS[o.status]}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-text-primary">{place}</p>
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-text-muted" title={new Date(o.created_at).toLocaleString("ar")}>
          <ClockIcon className="size-3.5" />
          {timeAgo}
        </span>
      </div>

      {/* الأصناف */}
      <ul className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
        {previewItems.map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="w-6 shrink-0 font-bold tabular-nums text-brand">{i.quantity}×</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{i.menu_item_name ?? "صنف"}</span>
              {i.price_option_label ? <span className="text-text-muted"> · {i.price_option_label}</span> : null}
              {i.excluded_ingredients?.length ? (
                <span className="block text-xs font-semibold text-red-600 dark:text-red-400">بدون: {i.excluded_ingredients.join("، ")}</span>
              ) : null}
            </span>
          </li>
        ))}
        {more > 0 ? (
          <li>
            <button type="button" onClick={onOpenDetails} className="text-xs font-semibold text-brand">
              + {more} أصناف أخرى
            </button>
          </li>
        ) : null}
      </ul>

      {/* الزبون والويتر */}
      <div className="mt-3 space-y-2 text-sm">
        <CustomerPhoneActions
          phoneCountryPrefix={phoneCountryPrefix}
          customerPhone={o.customer_phone}
          displayNumber={o.display_number}
          trackingToken={o.tracking_token}
          subdomain={subdomain}
          publicBaseUrl={publicBaseUrl}
          restaurantName={restaurantName}
        />
        {o.delivery_address ? <p className="text-xs leading-relaxed text-text-secondary">العنوان: {o.delivery_address}</p> : null}
        {waitersSystemEnabled && o.fulfillment === "dine_in" && waitersForFilter.length > 0 ? (
          <select
            className="h-9 w-full rounded-lg border border-border bg-bg-base px-2 text-sm"
            value={o.table_waiter_id ?? ""}
            disabled={assigningWaiterOrderId === o.id || !onAssignWaiter}
            onChange={(e) => onAssignWaiter?.(o.id, e.target.value ? e.target.value : null)}
            aria-label="تعيين الويتر"
          >
            <option value="">الويتر: تلقائي</option>
            {waitersForFilter.map((w) => (
              <option key={w.id} value={w.id}>
                الويتر: {w.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/* المبلغ */}
      <div className="mt-auto pt-3">
        <div className="rounded-xl bg-bg-surface-2/70 px-3 py-2.5 text-sm">
          {ownerDisc > 0 || loyaltyDisc > 0 ? (
            <div className="mb-1.5 space-y-1 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span>المجموع</span>
                <span dir="ltr">{formatMenuPrice(subtotal, currencyCode)}</span>
              </div>
              {ownerDisc > 0 ? (
                <div className="flex justify-between">
                  <span>خصم خاص</span>
                  <span dir="ltr">−{formatMenuPrice(ownerDisc, currencyCode)}</span>
                </div>
              ) : null}
              {loyaltyDisc > 0 ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>خصم النقاط ({o.loyalty_points_used ?? 0})</span>
                  <span dir="ltr">−{formatMenuPrice(loyaltyDisc, currencyCode)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-text-secondary">المستحق</span>
            <span className="flex flex-col items-end">
              <span className="font-display text-xl font-bold" dir="ltr">
                {formatMenuPrice(payable, currencyCode)}
              </span>
              {showSecondary && secondaryCurrencyCode ? (
                <span className="text-[11px] text-text-muted" dir="ltr">
                  {formatMenuPrice(secondaryCentsFromPrimaryCents(payable, rate, roundStep), secondaryCurrencyCode)}
                </span>
              ) : null}
            </span>
          </div>
          {pointsEarnedOnOrder > 0 ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">+{pointsEarnedOnOrder} نقطة للزبون</p>
          ) : null}
        </div>

        {o.owner_can_apply_loyalty_redeem && onOwnerApplyLoyaltyRedeem ? (
          <button
            type="button"
            disabled={ownerRedeeming}
            onClick={() => void onOwnerApplyLoyaltyRedeem(o.id)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/60 py-2 text-xs font-semibold text-text-primary hover:bg-gold/10"
          >
            <GiftIcon className="size-3.5 text-gold" />
            {ownerRedeeming
              ? "جاري تطبيق الخصم…"
              : `للزبون ${o.customer_loyalty_points_balance} نقطة — خصم حتى ${formatMenuPrice(o.owner_redeem_max_discount_cents, currencyCode)}`}
          </button>
        ) : null}

        {/* الإجراءات */}
        <div className="mt-3 flex items-center gap-2">
          {next ? (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(o.id, next)}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {NEXT_ACTION_LABELS[next] ?? ORDER_STATUS_LABELS[next]}
              <ChevronLeftIcon className="size-4" />
            </button>
          ) : (
            <span className="flex h-11 flex-1 items-center justify-center rounded-xl bg-bg-surface-2 text-sm font-semibold text-text-muted">
              {ORDER_STATUS_LABELS[o.status]}
            </span>
          )}
          <OrderThermalPrintButton order={o} restaurantName={restaurantName} currencyCode={currencyCode} compact iconOnly />
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label="تفاصيل وتعديل الطلب"
            className="flex size-11 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-bg-surface-2"
          >
            <PencilIcon className="size-4" />
          </button>
          {/* قائمة كل الحالات (للإلغاء أو التراجع) — select شفاف فوق أيقونة */}
          <label className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-bg-surface-2">
            <EllipsisVerticalIcon className="size-4" />
            <select
              aria-label="تغيير الحالة"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={o.status}
              disabled={updating}
              onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
            >
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                <option key={st} value={st}>
                  {ORDER_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}
