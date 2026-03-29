"use client";

import type {
  Category,
  GuestOrderWithDetails,
  MenuItem,
  OrderStatus,
} from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ORDER_STATUS_LABELS, orderStatusBadgeClasses } from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { CustomerPhoneActions } from "./customer-phone-actions";
import { Button } from "@/components/ui/button";
import { OrderStaffEditor } from "./order-staff-editor";
import { OrderThermalPrintButton } from "./order-thermal-print-button";

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
  onOwnerApplyLoyaltyRedeem?: (orderId: string) => void | Promise<void>;
  ownerRedeeming?: boolean;
  waitersSystemEnabled?: boolean;
  waitersForFilter?: { id: string; name: string }[];
  onAssignWaiter?: (orderId: string, waiterId: string | null) => void | Promise<void>;
  assigningWaiterOrderId?: string | null;
  menuItems: MenuItem[];
  categories: Category[];
  staffSavingKey: string | null;
  onSaveStaffNotes: (orderId: string, notes: string) => Promise<void>;
  onSaveOwnerDiscount: (orderId: string, discountCents: number) => Promise<void>;
  onAddOrderItem: (
    orderId: string,
    input: { menuItemId: string; quantity: number; priceOptionLabel: string | null }
  ) => Promise<void>;
  onChangeOrderItemQty: (orderId: string, orderItemId: string, quantity: number) => Promise<void>;
  onRemoveOrderItem: (orderId: string, orderItemId: string) => Promise<void>;
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
  onOwnerApplyLoyaltyRedeem,
  ownerRedeeming = false,
  waitersSystemEnabled = false,
  waitersForFilter = [],
  onAssignWaiter,
  assigningWaiterOrderId = null,
  menuItems,
  categories,
  staffSavingKey,
  onSaveStaffNotes,
  onSaveOwnerDiscount,
  onAddOrderItem,
  onChangeOrderItemQty,
  onRemoveOrderItem,
}: Props) {
  if (!order) return null;
  const subtotal = order.items.reduce((s, i) => s + i.line_total_cents, 0);
  const loyaltyDisc = order.loyalty_discount_cents ?? 0;
  const ownerDisc = order.owner_discount_cents ?? 0;
  const payable = Math.max(0, subtotal - loyaltyDisc - ownerDisc);
  const pointsEarnedOnOrder = order.loyalty_points_earned_on_order ?? 0;
  const structureEditBlocked =
    order.status === "completed" || order.status === "cancelled"
      ? "لا يمكن تعديل الأصناف أو الخصم اليدوي بعد إكمال أو إلغاء الطلب."
      : (order.loyalty_discount_cents ?? 0) > 0 || (order.loyalty_points_used ?? 0) > 0
        ? "لا يمكن تعديل الأصناف أو الخصم اليدوي بعد تطبيق خصم النقاط."
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        scrollable
        showCloseButton
        className={cn(
          "w-[min(96vw,1180px)] max-w-none gap-0 border-border/80 p-0 sm:max-w-none",
          "flex max-h-[min(92vh,880px)] flex-col overflow-hidden"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border bg-background/95 px-4 py-4 pe-14 text-start backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-mono text-2xl tabular-nums" dir="ltr">
              #{order.display_number}
            </DialogTitle>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                orderStatusBadgeClasses(order.status)
              )}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <DialogDescription className="text-start">
            {new Date(order.created_at).toLocaleString("en-GB", {
              dateStyle: "short",
              timeStyle: "short",
              hour12: false,
            })}{" "}
            — {FULFILLMENT_LABELS[order.fulfillment] ?? order.fulfillment}
            {order.table_label ? ` — الطاولة: ${order.table_label}` : ""}
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <OrderThermalPrintButton
              order={order}
              restaurantName={restaurantName}
              currencyCode={currencyCode}
            />
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <OrderStaffEditor
              order={order}
              currencyCode={currencyCode}
              structureEditBlocked={structureEditBlocked}
              menuItems={menuItems}
              categories={categories}
              savingKey={staffSavingKey}
              onSaveNotes={async (notes) => {
                await onSaveStaffNotes(order.id, notes);
              }}
              onSaveDiscount={async (cents) => {
                await onSaveOwnerDiscount(order.id, cents);
              }}
              onAddItem={async (input) => {
                await onAddOrderItem(order.id, input);
              }}
              onChangeQuantity={async (orderItemId, quantity) => {
                await onChangeOrderItemQty(order.id, orderItemId, quantity);
              }}
              onRemoveItem={async (orderItemId) => {
                await onRemoveOrderItem(order.id, orderItemId);
              }}
            />
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-border bg-muted/20 p-4 lg:w-[min(100%,380px)] lg:border-s lg:border-t-0 lg:overflow-y-auto">
            {waitersSystemEnabled && order.fulfillment === "dine_in" ? (
              <div className="rounded-lg border border-border/80 bg-background/80 p-3 text-sm shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">الويتر المسؤول</p>
                {waitersForFilter.length > 0 ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm font-medium"
                    value={order.table_waiter_id ?? ""}
                    disabled={assigningWaiterOrderId === order.id}
                    onChange={(e) =>
                      onAssignWaiter?.(order.id, e.target.value ? e.target.value : null)
                    }
                    aria-label="تعيين الويتر"
                  >
                    <option value="">— تلقائي (ويتر الطاولة إن وُجد) —</option>
                    {waitersForFilter.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                    أضف أسماء الويترز من الإعدادات لتعيينهم هنا.
                  </p>
                )}
              </div>
            ) : null}

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
                <p className="mt-1 text-xs text-muted-foreground">
                  العنوان: {order.delivery_address}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border/80 pt-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">مجموع الأصناف</span>
                <span dir="ltr" className="tabular-nums">
                  {formatMenuPrice(subtotal, currencyCode)}
                </span>
              </div>
              {ownerDisc > 0 ? (
                <div className="flex items-center justify-between gap-2 text-sky-800 dark:text-sky-300/95">
                  <span>خصم خاص</span>
                  <span dir="ltr" className="tabular-nums">
                    −{formatMenuPrice(ownerDisc, currencyCode)}
                  </span>
                </div>
              ) : null}
              {loyaltyDisc > 0 ? (
                <div className="flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                  <span>
                    خصم نقاط الولاء
                    {order.loyalty_points_used ? (
                      <span className="ms-1 tabular-nums" dir="ltr">
                        ({order.loyalty_points_used} نقطة)
                      </span>
                    ) : null}
                  </span>
                  <span dir="ltr" className="tabular-nums">
                    −{formatMenuPrice(loyaltyDisc, currencyCode)}
                  </span>
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-border/80 bg-background/60 p-3">
                  <p className="text-xs font-medium text-foreground">الولاء على هذا الطلب</p>
                  <p className="text-[11px] text-muted-foreground">
                    رصيد نقاط الزبون الحالي:{" "}
                    <span className="font-semibold tabular-nums text-foreground" dir="ltr">
                      {order.customer_loyalty_points_balance}
                    </span>
                  </p>
                  {order.owner_can_apply_loyalty_redeem && onOwnerApplyLoyaltyRedeem ? (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        يمكنك تطبيق أقصى خصم مسموح بهذا الطلب ويُخصم من رصيد الزبون تلقائياً.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={ownerRedeeming}
                        onClick={() => void onOwnerApplyLoyaltyRedeem(order.id)}
                      >
                        {ownerRedeeming
                          ? "جاري التطبيق…"
                          : `تطبيق خصم النقاط (−${formatMenuPrice(order.owner_redeem_max_discount_cents, currencyCode)} · ${order.owner_redeem_max_points} نقطة)`}
                      </Button>
                    </>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      لا يتوفر تطبيق خصم من هنا (لا رصيد كافٍ، أو مبلغ أصناف أقل من قيمة نقطة، أو طلب
                      ملغى).
                    </p>
                  )}
                </div>
              )}
              {pointsEarnedOnOrder > 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-emerald-800 dark:text-emerald-300/95">
                  <span className="text-[12px] font-medium">نقاط مكتسبة من هذا الطلب</span>
                  <span dir="ltr" className="text-sm font-bold tabular-nums">
                    +{pointsEarnedOnOrder}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2 font-semibold">
                <span>المستحق</span>
                <span dir="ltr" className="text-lg font-bold tabular-nums">
                  {formatMenuPrice(payable, currencyCode)}
                </span>
              </div>
              {showSecondary && secondaryCurrencyCode ? (
                <p dir="ltr" className="text-end text-xs tabular-nums text-muted-foreground">
                  {formatMenuPrice(
                    secondaryCentsFromPrimaryCents(payable, rate),
                    secondaryCurrencyCode
                  )}
                </p>
              ) : null}
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
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
