"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { MenuItem, OrderFulfillment, Restaurant } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import { createGuestOrder } from "@/app/actions/orders";
import { parseExcludedIngredients } from "@/lib/order-exclusions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusIcon, MinusIcon, Trash2Icon } from "lucide-react";

export type CartLine = {
  menuItemId: string;
  quantity: number;
  priceOptionLabel: string | null;
  /** مكوّنات يطلب الزبون عدم إضافتها في الطبق */
  excludedIngredients: string[];
};

export type TableContext = {
  fromQr: { id: string; label: string } | null;
  /** من query ?t= */
  token: string | null;
  publicTables: { id: string; label: string }[];
};

/** يميّز سطر السلة (نفس الصنف + الحجم + نفس قائمة الاستبعاد) */
export function cartLineKey(line: CartLine): string {
  const ex = [...line.excludedIngredients].sort().join("|\u0001|");
  return `${line.menuItemId}::${line.priceOptionLabel ?? ""}::${ex}`;
}

export function MenuCartBar({
  cart,
  menuById,
  currencyCode,
  secondaryEnabled,
  secondaryCurrencyCode,
  secondaryExchangeRate,
  secondaryRoundStep = 0,
  secondaryFirst = false,
  onCheckout,
  onCancelOrder,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  currencyCode: string;
  secondaryEnabled: boolean;
  secondaryCurrencyCode: string | null;
  secondaryExchangeRate: number | null;
  secondaryRoundStep?: number;
  /** الليرة بالخط الكبير أولاً */
  secondaryFirst?: boolean;
  onCheckout: () => void;
  /** إفراغ السلة وإغلاق أي خطوة إتمام (من لوحة السفلية) */
  onCancelOrder: () => void;
}) {
  const totalCents = useMemo(() => {
    let t = 0;
    for (const line of cart) {
      const item = menuById.get(line.menuItemId);
      if (!item) continue;
      const r = resolveUnitPriceCents(item, line.priceOptionLabel);
      if (!r.ok) continue;
      t += r.cents * line.quantity;
    }
    return t;
  }, [cart, menuById]);

  const totalSecondaryCents = useMemo(() => {
    if (!secondaryEnabled || !secondaryCurrencyCode) return null;
    let t = 0;
    for (const line of cart) {
      const item = menuById.get(line.menuItemId);
      if (!item) continue;
      const r = resolveUnitPriceCents(item, line.priceOptionLabel);
      if (!r.ok) continue;
      const sec = resolveSecondaryUnitCents(
        item,
        r.cents,
        line.priceOptionLabel,
        secondaryExchangeRate,
        secondaryRoundStep
      );
      if (sec == null) return null;
      t += sec * line.quantity;
    }
    return t;
  }, [cart, menuById, secondaryEnabled, secondaryCurrencyCode, secondaryExchangeRate, secondaryRoundStep]);

  if (cart.length === 0) return null;
  const count = cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" dir="rtl">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <button
          type="button"
          onClick={onCheckout}
          className="flex h-14 flex-1 items-center justify-between rounded-full bg-brand pe-5 ps-2 text-white shadow-[0_16px_40px_-12px_var(--brand)] transition active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/20 text-base font-bold tabular-nums">
              {count}
            </span>
            <span className="text-[15px] font-bold">عرض الطلب</span>
          </span>
          <span className="flex flex-col items-end leading-tight" dir="ltr">
            {totalSecondaryCents != null && secondaryCurrencyCode && secondaryFirst ? (
              <>
                <span className="text-[15px] font-bold tabular-nums">{formatMenuPrice(totalSecondaryCents, secondaryCurrencyCode)}</span>
                <span className="text-[11px] opacity-80 tabular-nums">{formatMenuPrice(totalCents, currencyCode)}</span>
              </>
            ) : (
              <>
                <span className="text-[15px] font-bold tabular-nums">{formatMenuPrice(totalCents, currencyCode)}</span>
                {totalSecondaryCents != null && secondaryCurrencyCode ? (
                  <span className="text-[11px] opacity-80 tabular-nums">
                    {formatMenuPrice(totalSecondaryCents, secondaryCurrencyCode)}
                  </span>
                ) : null}
              </>
            )}
          </span>
        </button>
        <button
          type="button"
          aria-label="إفراغ السلة"
          onClick={onCancelOrder}
          className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-bg-surface text-text-secondary shadow-lg"
        >
          <Trash2Icon className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function CartLinesEditor({
  cart,
  setCart,
  menuById,
  currencyCode,
  secondaryEnabled,
  secondaryCurrencyCode,
  secondaryExchangeRate,
  secondaryRoundStep = 0,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  currencyCode: string;
  secondaryEnabled: boolean;
  secondaryCurrencyCode: string | null;
  secondaryExchangeRate: number | null;
  secondaryRoundStep?: number;
}) {
  return (
    <ul className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto text-sm">
      {cart.map((line, idx) => {
        const item = menuById.get(line.menuItemId);
        if (!item) return null;
        const r = resolveUnitPriceCents(item, line.priceOptionLabel);
        const unit = r.ok ? r.cents : 0;
        const lineSecondaryCents =
          secondaryEnabled && secondaryCurrencyCode && r.ok
            ? resolveSecondaryUnitCents(
                item,
                unit,
                line.priceOptionLabel,
                secondaryExchangeRate,
                secondaryRoundStep
              )
            : null;
        return (
          <li
            key={idx}
            className="space-y-2 rounded-lg border border-stone-200/80 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold leading-snug text-stone-900 dark:text-stone-50">
                  {item.name}
                </p>
                {line.priceOptionLabel ? (
                  <p className="mt-0.5 text-[11px] font-medium text-stone-600 dark:text-stone-400">
                    {line.priceOptionLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="outline"
                  onClick={() =>
                    setCart((prev) => {
                      const copy = [...prev];
                      if (copy[idx].quantity <= 1) copy.splice(idx, 1);
                      else
                        copy[idx] = {
                          ...copy[idx],
                          quantity: copy[idx].quantity - 1,
                        };
                      return copy;
                    })
                  }
                >
                  <MinusIcon className="size-3" />
                </Button>
                <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="outline"
                  onClick={() =>
                    setCart((prev) => {
                      const copy = [...prev];
                      copy[idx] = {
                        ...copy[idx],
                        quantity: Math.min(99, copy[idx].quantity + 1),
                      };
                      return copy;
                    })
                  }
                >
                  <PlusIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
              <div className="flex min-w-[4.5rem] flex-col items-end gap-0.5 text-end">
                <span
                  className="text-xs font-medium tabular-nums text-stone-800 dark:text-stone-200"
                  dir="ltr"
                >
                  {formatMenuPrice(unit * line.quantity, currencyCode)}
                </span>
                {lineSecondaryCents != null && secondaryCurrencyCode ? (
                  <span
                    className="text-[10px] tabular-nums text-stone-500 dark:text-stone-400"
                    dir="ltr"
                  >
                    {formatMenuPrice(lineSecondaryCents * line.quantity, secondaryCurrencyCode)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-stone-600 dark:text-stone-400">
                بدون مكونات (اختياري)
              </label>
              <Textarea
                value={line.excludedIngredients.join("، ")}
                onChange={(e) => {
                  const parsed = parseExcludedIngredients(e.target.value);
                  setCart((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, excludedIngredients: parsed } : l))
                  );
                }}
                placeholder="مثال: حار، بصل، صوص…"
                rows={2}
                className="min-h-0 resize-y text-xs"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MenuCheckoutDialog({
  open,
  onOpenChange,
  restaurant,
  subdomain,
  currencyCode,
  cart,
  setCart,
  menuById,
  tableCtx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurant: Restaurant;
  subdomain: string;
  currencyCode: string;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  tableCtx: TableContext;
}) {
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(
    tableCtx.fromQr ? "dine_in" : null
  );
  const [tableId, setTableId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMeta, setSuccessMeta] = useState<{
    displayNumber: number;
    trackingToken: string;
  } | null>(null);


  // تصفير حالة النافذة عند إغلاقها (أثناء الرسم بدل useEffect + setState)
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setSuccess(false);
      setMessage(null);
      setSuccessMeta(null);
    }
  }

  /** يضمن تفريغ السلة فوراً قبل رسم شاشة النجاح (حتى يختفي شريط السلة فوراً). */
  useLayoutEffect(() => {
    if (success) {
      setCart([]);
    }
  }, [success, setCart]);

  const totalCents = useMemo(() => {
    let t = 0;
    for (const line of cart) {
      const item = menuById.get(line.menuItemId);
      if (!item) continue;
      const r = resolveUnitPriceCents(item, line.priceOptionLabel);
      if (!r.ok) continue;
      t += r.cents * line.quantity;
    }
    return t;
  }, [cart, menuById]);

  const secondaryCode = restaurant.secondary_currency_code ?? null;
  const secondaryExchangeRate =
    restaurant.secondary_currency_exchange_rate != null
      ? Number(restaurant.secondary_currency_exchange_rate)
      : null;
  const secondaryOn =
    restaurant.secondary_currency_enabled === true && Boolean(secondaryCode);
  const secondaryRoundStep = Number(restaurant.secondary_round_step ?? 0);
  const secondaryFirst = restaurant.show_secondary_first === true;

  const totalSecondaryCents = useMemo(() => {
    if (!secondaryOn || !secondaryCode) return null;
    let t = 0;
    for (const line of cart) {
      const item = menuById.get(line.menuItemId);
      if (!item) continue;
      const r = resolveUnitPriceCents(item, line.priceOptionLabel);
      if (!r.ok) continue;
      const sec = resolveSecondaryUnitCents(
        item,
        r.cents,
        line.priceOptionLabel,
        secondaryExchangeRate,
        secondaryRoundStep
      );
      if (sec == null) return null;
      t += sec * line.quantity;
    }
    return t;
  }, [cart, menuById, secondaryOn, secondaryCode, secondaryExchangeRate, secondaryRoundStep]);

  // نقاط متوقعة عند اكتمال الطلب — الاستبدال يتم عند الموظف فقط
  const loyaltyOn = restaurant.loyalty_program_enabled === true;
  const spendPerPoint = Math.max(1, Number(restaurant.loyalty_spend_cents_per_point ?? 100));
  const pointsToEarn = loyaltyOn ? Math.floor(totalCents / spendPerPoint) : 0;

  async function submit() {
    setMessage(null);
    const f = tableCtx.fromQr ? "dine_in" : fulfillment;
    if (!f) {
      setMessage("اختر نوع الطلب");
      return;
    }
    if (!phone.trim()) {
      setMessage("أدخل رقم الجوال");
      return;
    }
    if (f === "dine_in" && !tableCtx.fromQr) {
      if (!tableId) {
        setMessage("اختر الطاولة");
        return;
      }
    }
    if (f === "delivery" && address.trim().length < 5) {
      setMessage("أدخل عنوان التوصيل كاملاً");
      return;
    }

    setSubmitting(true);
    const res = await createGuestOrder({
      subdomain,
      tableToken: tableCtx.token,
      fulfillment: f,
      tableId: f === "dine_in" && !tableCtx.fromQr ? tableId : null,
      deliveryAddress: f === "delivery" ? address.trim() : null,
      customerPhone: phone.trim(),
      items: cart.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        priceOptionLabel: l.priceOptionLabel,
        excludedIngredients: l.excludedIngredients,
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setSuccessMeta({
      displayNumber: res.displayNumber,
      trackingToken: res.trackingToken,
    });
    setCart([]);
    setPhone("");
    setFulfillment(tableCtx.fromQr ? "dine_in" : null);
    setTableId("");
    setAddress("");
    setSuccess(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" scrollable showCloseButton={!submitting}>
        {success && successMeta ? (
          <>
            <DialogHeader className="p-4 pb-0">
              <DialogTitle>تم استلام طلبك</DialogTitle>
              <DialogDescription className="sr-only">
                تم تأكيد الطلب ورقم الطلب والتتبع أدناه.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 px-4 text-start">
              <p className="text-sm text-muted-foreground">
                سيصل الطلب إلى المطعم مباشرة. شكراً لثقتك بنا.
              </p>
              <p className="font-mono text-2xl font-bold text-foreground tabular-nums" dir="ltr">
                رقم الطلب: #{successMeta.displayNumber}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                يمكنك متابعة حالة الطلب من الصفحة التالية في أي وقت:
              </p>
              <Link
                href={`/menu/${encodeURIComponent(subdomain)}/track/${successMeta.trackingToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "w-full justify-center"
                )}
              >
                تتبّع الطلب
              </Link>
            </div>
            <DialogFooter className="p-4 pt-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setCart([]);
                  setSuccess(false);
                  setSuccessMeta(null);
                  onOpenChange(false);
                }}
              >
                حسناً
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>إتمام الطلب — {restaurant.name}</DialogTitle>
          <DialogDescription>
            أدخل رقم جوالك فقط لإتمام الطلب. قد يُستخدم لاحقاً لعروض وولاء العملاء.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
          {tableCtx.fromQr && (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
              الطاولة: <strong>{tableCtx.fromQr.label}</strong> — تم التعرف عليها تلقائياً من الرمز.
            </p>
          )}

          {!tableCtx.fromQr && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-600 dark:text-stone-400">نوع الطلب</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["delivery", "توصيل"],
                    ["pickup", "استلام من المطعم"],
                    ["dine_in", "داخل المطعم"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setFulfillment(k);
                      if (k !== "dine_in") setTableId("");
                      if (k !== "delivery") setAddress("");
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition",
                      fulfillment === k
                        ? "border-amber-500 bg-amber-500/15 text-stone-900 dark:text-stone-50"
                        : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!tableCtx.fromQr && fulfillment === "dine_in" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                اختر الطاولة
              </label>
              <select
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
              >
                <option value="">— اختر —</option>
                {tableCtx.publicTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {tableCtx.publicTables.length === 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  لم يُعرّف صاحب المطعم طاولات بعد. يمكنك الطلب للتوصيل أو الاستلام.
                </p>
              )}
            </div>
          )}

          {fulfillment === "delivery" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                عنوان التوصيل
              </label>
              <textarea
                className="min-h-[88px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
                placeholder="المدينة، الحي، الشارع، رقم المبنى..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
              رقم الجوال
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-stone-600 dark:bg-stone-900"
              placeholder="مثال: 05xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {loyaltyOn ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-gold/15 px-3 py-2.5 text-[13px] text-text-primary">
              <span aria-hidden className="text-base leading-5">✨</span>
              <p className="leading-5">
                {pointsToEarn > 0 ? (
                  <>
                    ستكسب <span className="font-bold tabular-nums">{pointsToEarn}</span> نقطة عند اكتمال طلبك.{" "}
                  </>
                ) : null}
                <span className="text-text-secondary">لاستخدام نقاطك، اطلب ذلك من الموظف عند الدفع.</span>
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-stone-600 dark:text-stone-400">ملخص الطلب</p>
              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                يمكنك ذكر المكوّنات التي لا تريدها في الطبق (مثل: حار، بصل).
              </p>
            </div>
            <CartLinesEditor
              cart={cart}
              setCart={setCart}
              menuById={menuById}
              currencyCode={currencyCode}
              secondaryEnabled={secondaryOn}
              secondaryCurrencyCode={secondaryCode}
              secondaryExchangeRate={secondaryExchangeRate}
              secondaryRoundStep={secondaryRoundStep}
            />
          </div>

          <div className="rounded-2xl border border-brand/25 bg-brand-light px-4 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span
                className="font-display text-3xl font-bold tabular-nums text-brand"
                dir="ltr"
              >
                {secondaryFirst && totalSecondaryCents != null && secondaryCode
                  ? formatMenuPrice(totalSecondaryCents, secondaryCode)
                  : formatMenuPrice(totalCents, currencyCode)}
              </span>
              {totalSecondaryCents != null && secondaryCode ? (
                <span
                  className="inline-flex items-center gap-2 border-s border-brand/25 ps-4 text-sm font-semibold tabular-nums text-text-secondary"
                  dir="ltr"
                >
                  {secondaryFirst
                    ? formatMenuPrice(totalCents, currencyCode)
                    : formatMenuPrice(totalSecondaryCents, secondaryCode)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-center text-[11px] text-stone-500 dark:text-stone-400">
              الإجمالي المقدّر للطلب
            </p>
          </div>

          {message ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {message}
            </p>
          ) : null}
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إغلاق
          </Button>
          <Button type="button" onClick={submit} disabled={submitting || cart.length === 0}>
            {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
