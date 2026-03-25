"use client";

import type { GuestOrderWithDetails, OrderStatus } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  nextOperationalStatus,
  orderStatusBadgeClasses,
  orderStatusCardClasses,
} from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeftIcon } from "lucide-react";
import { CustomerPhoneActions } from "./customer-phone-actions";

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
  secondaryCurrencyCode: string | null;
  updating: boolean;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onOpenDetails: () => void;
  phoneCountryPrefix: string | null;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
};

export function OrderCard({
  order: o,
  currencyCode,
  showSecondary,
  rate,
  secondaryCurrencyCode,
  updating,
  onStatusChange,
  onOpenDetails,
  phoneCountryPrefix,
  subdomain,
  publicBaseUrl,
  restaurantName,
}: Props) {
  const total = o.items.reduce((s, i) => s + i.line_total_cents, 0);
  const next = nextOperationalStatus(o.status);
  const previewItems = o.items.slice(0, 3);
  const more = o.items.length - previewItems.length;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition-shadow hover:shadow-md md:p-5",
        orderStatusCardClasses(o.status)
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground md:text-3xl"
              dir="ltr"
            >
              #{o.display_number}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                orderStatusBadgeClasses(o.status)
              )}
            >
              {ORDER_STATUS_LABELS[o.status]}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
            <span dir="ltr" className="tabular-nums">
              {new Date(o.created_at).toLocaleString("en-GB", {
                dateStyle: "short",
                timeStyle: "short",
                hour12: false,
              })}
            </span>
          </p>
          <div className="space-y-0.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground">جوال الزبون</p>
            <CustomerPhoneActions
              phoneCountryPrefix={phoneCountryPrefix}
              customerPhone={o.customer_phone}
              displayNumber={o.display_number}
              trackingToken={o.tracking_token}
              subdomain={subdomain}
              publicBaseUrl={publicBaseUrl}
              restaurantName={restaurantName}
            />
            <p className="text-muted-foreground">
              {FULFILLMENT_LABELS[o.fulfillment] ?? o.fulfillment}
              {o.table_label ? ` — الطاولة: ${o.table_label}` : ""}
            </p>
            {o.delivery_address ? (
              <p className="text-xs leading-relaxed text-muted-foreground">العنوان: {o.delivery_address}</p>
            ) : null}
          </div>
          <ul className="space-y-1 border-t border-border/50 pt-2 text-sm">
            {previewItems.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate font-medium">
                  {i.menu_item_name ?? "صنف"}
                  {i.price_option_label ? ` (${i.price_option_label})` : ""} × {i.quantity}
                </span>
              </li>
            ))}
            {more > 0 ? (
              <li className="text-xs text-muted-foreground">+ {more} أصناف أخرى</li>
            ) : null}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="text-end">
            <p dir="ltr" className="text-xl font-bold tabular-nums text-foreground">
              {formatMenuPrice(total, currencyCode)}
            </p>
            {showSecondary && secondaryCurrencyCode ? (
              <p dir="ltr" className="text-xs font-medium tabular-nums text-muted-foreground">
                {formatMenuPrice(secondaryCentsFromPrimaryCents(total, rate), secondaryCurrencyCode)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {next ? (
              <Button
                size="sm"
                className="w-full justify-center gap-1 sm:w-auto"
                disabled={updating}
                onClick={() => onStatusChange(o.id, next)}
              >
                {ORDER_STATUS_LABELS[next]}
                <ChevronLeftIcon className="size-4" aria-hidden />
              </Button>
            ) : null}
            {o.status === "ready" ? (
              <p className="text-center text-xs text-blue-200/90 sm:text-end">
                الطلب جاهز — يمكن للعميل الاستلام أو التواصل عبر الأزرار أعلاه.
              </p>
            ) : null}
            <label className="flex items-center gap-2 text-xs text-muted-foreground sm:flex-col sm:items-end">
              <span className="sr-only">تحديث الحالة</span>
              <select
                className="max-w-full rounded-lg border border-input bg-background px-2 py-2 text-sm font-medium"
                value={o.status}
                disabled={updating}
                onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
              >
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onOpenDetails}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              عرض التفاصيل
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
