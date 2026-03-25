"use client";

import type { GuestOrderWithDetails, OrderStatus } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ORDER_STATUS_LABELS, orderStatusBadgeClasses } from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { CustomerPhoneActions } from "./customer-phone-actions";

const FULFILLMENT_LABELS: Record<string, string> = {
  dine_in: "داخل المطعم",
  pickup: "استلام",
  delivery: "توصيل",
};

type Props = {
  order: GuestOrderWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencyCode: string;
  showSecondary: boolean;
  rate: number;
  secondaryCurrencyCode: string | null;
  updating: boolean;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  phoneCountryPrefix: string | null;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
};

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  currencyCode,
  showSecondary,
  rate,
  secondaryCurrencyCode,
  updating,
  onStatusChange,
  phoneCountryPrefix,
  subdomain,
  publicBaseUrl,
  restaurantName,
}: Props) {
  if (!order) return null;
  const total = order.items.reduce((s, i) => s + i.line_total_cents, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border text-start">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="font-mono text-2xl tabular-nums" dir="ltr">
              #{order.display_number}
            </SheetTitle>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                orderStatusBadgeClasses(order.status)
              )}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <SheetDescription className="text-start">
            {new Date(order.created_at).toLocaleString("en-GB", {
              dateStyle: "short",
              timeStyle: "short",
              hour12: false,
            })}{" "}
            — {FULFILLMENT_LABELS[order.fulfillment] ?? order.fulfillment}
            {order.table_label ? ` — الطاولة: ${order.table_label}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="text-sm">
            <p className="text-xs font-medium text-muted-foreground">جوال الزبون</p>
            <CustomerPhoneActions
              phoneCountryPrefix={phoneCountryPrefix}
              customerPhone={order.customer_phone}
              displayNumber={order.display_number}
              trackingToken={order.tracking_token}
              subdomain={subdomain}
              publicBaseUrl={publicBaseUrl}
              restaurantName={restaurantName}
              className="mt-1"
            />
            {order.delivery_address ? (
              <p className="mt-1 text-xs text-muted-foreground">العنوان: {order.delivery_address}</p>
            ) : null}
          </div>
          <ul className="space-y-3 border-t border-border pt-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {i.menu_item_name ?? "صنف"}
                    {i.price_option_label ? ` (${i.price_option_label})` : ""} × {i.quantity}
                  </span>
                  <span dir="ltr" className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMenuPrice(i.line_total_cents, currencyCode)}
                    {showSecondary && secondaryCurrencyCode ? (
                      <span className="mr-2 block text-[11px] opacity-80">
                        {formatMenuPrice(
                          secondaryCentsFromPrimaryCents(i.line_total_cents, rate),
                          secondaryCurrencyCode
                        )}
                      </span>
                    ) : null}
                  </span>
                </div>
                {i.excluded_ingredients && i.excluded_ingredients.length > 0 ? (
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">بدون: </span>
                    {i.excluded_ingredients.join("، ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold">الإجمالي</span>
            <span dir="ltr" className="text-lg font-bold tabular-nums">
              {formatMenuPrice(total, currencyCode)}
            </span>
          </div>
          <label className="block text-sm font-medium text-muted-foreground">
            تحديث الحالة
            <select
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={order.status}
              disabled={updating}
              onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            >
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
