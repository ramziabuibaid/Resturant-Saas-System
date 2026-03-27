"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { MenuItem, OrderFulfillment, Restaurant } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import { createGuestOrder, getCheckoutLoyaltyPreview } from "@/app/actions/orders";
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
import { ShoppingBagIcon, PlusIcon, MinusIcon, Trash2Icon } from "lucide-react";

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

/** سياق المنيو: طاولة عبر QR أو زيارة عامة (رابط/سوشال) */
export type AddItemOrderContext = "table_qr" | "remote";

function addItemButtonLabel(ctx: AddItemOrderContext): string {
  return ctx === "table_qr" ? "أضف إلى الطاولة" : "أضف إلى طلبك";
}

export function AddItemButton({
  item,
  unavailable,
  onAdd,
  orderContext = "remote",
}: {
  item: MenuItem;
  unavailable: boolean;
  onAdd: (line: CartLine) => void;
  /** من رمز QR للطاولة → صياغة الطاولة؛ غير ذلك → طلب طعام عام */
  orderContext?: AddItemOrderContext;
}) {
  const addLabel = addItemButtonLabel(orderContext);
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [excludedText, setExcludedText] = useState("");
  const priceOpts = Array.isArray(item.price_options) ? item.price_options : [];
  const optionCount = priceOpts.length;
  /** شاشة الاختيار فقط عند وجود أكثر من حجم/وزن */
  const needsSizeDialog = optionCount > 1;

  function confirm() {
    if (needsSizeDialog && !option) return;
    onAdd({
      menuItemId: item.id,
      quantity: qty,
      priceOptionLabel: option,
      excludedIngredients: parseExcludedIngredients(excludedText),
    });
    setOpen(false);
    setQty(1);
    setOption("");
    setExcludedText("");
  }

  if (unavailable) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="default"
        className={cn(
          "mt-2 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
          "text-xs leading-snug sm:text-sm"
        )}
        onClick={() => {
          if (optionCount === 0) {
            onAdd({
              menuItemId: item.id,
              quantity: 1,
              priceOptionLabel: null,
              excludedIngredients: [],
            });
          } else if (optionCount === 1) {
            onAdd({
              menuItemId: item.id,
              quantity: 1,
              priceOptionLabel: priceOpts[0]!.label,
              excludedIngredients: [],
            });
          } else {
            setOption(priceOpts[0]!.label);
            setExcludedText("");
            setOpen(true);
          }
        }}
      >
        <PlusIcon className="size-4 shrink-0" />
        {addLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setExcludedText("");
        }}
      >
        <DialogContent className="sm:max-w-md" scrollable>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>اختر الحجم أو الوزن ثم الكمية.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            {needsSizeDialog ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400">الخيار</label>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
                  value={option}
                  onChange={(e) => setOption(e.target.value)}
                >
                  {priceOpts.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-600 dark:text-stone-400">الكمية</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <MinusIcon className="size-4" />
                </Button>
                <span className="min-w-[2ch] text-center tabular-nums">{qty}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                بدون مكونات (اختياري)
              </label>
              <Textarea
                value={excludedText}
                onChange={(e) => setExcludedText(e.target.value)}
                placeholder="مثال: حار، بصل، صوص…"
                rows={2}
                className="min-h-0 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter className="border-t-0 p-4 pt-0 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={confirm} disabled={Boolean(needsSizeDialog && !option)}>
              {addLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MenuCartBar({
  cart,
  setCart,
  menuById,
  currencyCode,
  secondaryEnabled,
  secondaryCurrencyCode,
  secondaryExchangeRate,
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
        secondaryExchangeRate
      );
      if (sec == null) return null;
      t += sec * line.quantity;
    }
    return t;
  }, [cart, menuById, secondaryEnabled, secondaryCurrencyCode, secondaryExchangeRate]);

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-stone-950/95">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {cart.reduce((s, l) => s + l.quantity, 0)} صنف في السلة
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p
              className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
              dir="ltr"
            >
              {formatMenuPrice(totalCents, currencyCode)}
            </p>
            {totalSecondaryCents != null && secondaryCurrencyCode ? (
              <p
                className="text-xs font-medium tabular-nums text-stone-500 dark:text-stone-400"
                dir="ltr"
              >
                {formatMenuPrice(totalSecondaryCents, secondaryCurrencyCode)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex w-full min-w-0 items-stretch gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-0 flex-1 border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900 sm:flex-initial"
            onClick={onCancelOrder}
          >
            إلغاء الطلب
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-0 flex-1 shrink-0 gap-2 sm:flex-initial"
            onClick={onCheckout}
          >
            <ShoppingBagIcon className="size-5 shrink-0" />
            إتمام الطلب
          </Button>
        </div>
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
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  currencyCode: string;
  secondaryEnabled: boolean;
  secondaryCurrencyCode: string | null;
  secondaryExchangeRate: number | null;
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
                secondaryExchangeRate
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

  const [loyaltyPreview, setLoyaltyPreview] = useState<{
    programEnabled: boolean;
    pointsBalance: number;
    pointValueCents: number;
  } | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);

  useEffect(() => {
    if (!open) {
      setSuccess(false);
      setMessage(null);
      setSuccessMeta(null);
      setLoyaltyPreview(null);
      setLoyaltyPointsToRedeem(0);
      setLoyaltyLoading(false);
    }
  }, [open]);

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
        secondaryExchangeRate
      );
      if (sec == null) return null;
      t += sec * line.quantity;
    }
    return t;
  }, [cart, menuById, secondaryOn, secondaryCode, secondaryExchangeRate]);

  useEffect(() => {
    if (!open) return;
    const raw = phone.trim();
    if (raw.length < 8) {
      setLoyaltyPreview(null);
      setLoyaltyPointsToRedeem(0);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoyaltyLoading(true);
      const r = await getCheckoutLoyaltyPreview({ subdomain, customerPhone: raw });
      if (cancelled) return;
      setLoyaltyLoading(false);
      if (r.ok) {
        setLoyaltyPreview({
          programEnabled: r.programEnabled,
          pointsBalance: r.pointsBalance,
          pointValueCents: r.pointValueCents,
        });
      } else {
        setLoyaltyPreview(null);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, phone, subdomain]);

  const maxRedeemPoints = useMemo(() => {
    if (!loyaltyPreview?.programEnabled || totalCents <= 0) return 0;
    const pv = Math.max(1, loyaltyPreview.pointValueCents);
    const capByOrder = Math.floor(totalCents / pv);
    return Math.min(loyaltyPreview.pointsBalance, capByOrder);
  }, [loyaltyPreview, totalCents]);

  useEffect(() => {
    setLoyaltyPointsToRedeem((p) => Math.min(p, maxRedeemPoints));
  }, [maxRedeemPoints]);

  const appliedLoyaltyPoints = Math.min(loyaltyPointsToRedeem, maxRedeemPoints);
  const pointVal = Math.max(1, loyaltyPreview?.pointValueCents ?? 1);
  const discountPreviewCents = Math.min(
    totalCents,
    appliedLoyaltyPoints * pointVal
  );
  const netCents = Math.max(0, totalCents - discountPreviewCents);
  const netSecondaryCents =
    totalCents > 0 && totalSecondaryCents != null
      ? Math.round((netCents / totalCents) * totalSecondaryCents)
      : totalSecondaryCents;

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
    const redeemPts =
      loyaltyPreview?.programEnabled && appliedLoyaltyPoints > 0 ? appliedLoyaltyPoints : undefined;
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
      loyaltyPointsToRedeem: redeemPts,
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
            {loyaltyLoading ? (
              <p className="text-[11px] text-stone-500 dark:text-stone-400">جاري التحقق من رصيد النقاط…</p>
            ) : null}
          </div>

          {loyaltyPreview?.programEnabled ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">نقاط الولاء</p>
              <p className="mt-1 text-[13px] text-stone-800 dark:text-stone-200">
                رصيدك الحالي:{" "}
                <span className="font-bold tabular-nums" dir="ltr">
                  {loyaltyPreview.pointsBalance}
                </span>{" "}
                نقطة
              </p>
              {maxRedeemPoints > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300">
                    <span>استخدام نقاط على هذا الطلب</span>
                    <span className="tabular-nums font-medium" dir="ltr">
                      {appliedLoyaltyPoints} / {maxRedeemPoints}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxRedeemPoints}
                    value={appliedLoyaltyPoints}
                    onChange={(e) => setLoyaltyPointsToRedeem(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    قيمة النقطة ≈ {formatMenuPrice(pointVal, currencyCode)} — خصم متوقع{" "}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatMenuPrice(discountPreviewCents, currencyCode)}
                    </span>
                  </p>
                </div>
              ) : totalCents > 0 ? (
                <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200/90">
                  لا يمكن تطبيق نقاط على هذا المبلغ (الرصيد غير كافٍ أو قيمة الطلب أقل من نقطة واحدة).
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-stone-600 dark:text-stone-400">
                  أضف أصنافاً لاستخدام النقاط.
                </p>
              )}
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
            />
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-b from-emerald-50/90 to-white px-4 py-4 dark:border-stone-700 dark:from-emerald-950/40 dark:to-stone-900/80">
            {discountPreviewCents > 0 ? (
              <div className="mb-3 space-y-1 border-b border-emerald-200/60 pb-3 text-center text-[11px] text-stone-600 dark:border-emerald-800/50 dark:text-stone-400">
                <div className="flex justify-between gap-2">
                  <span>مجموع الأصناف</span>
                  <span dir="ltr" className="tabular-nums">
                    {formatMenuPrice(totalCents, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-emerald-800 dark:text-emerald-300/90">
                  <span>خصم نقاط الولاء</span>
                  <span dir="ltr" className="tabular-nums">
                    −{formatMenuPrice(discountPreviewCents, currencyCode)}
                  </span>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span
                className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                dir="ltr"
              >
                {formatMenuPrice(netCents, currencyCode)}
              </span>
              {netSecondaryCents != null && secondaryCode ? (
                <span
                  className="inline-flex items-center gap-2 border-s border-emerald-200/90 ps-4 text-sm font-semibold tabular-nums text-stone-600 dark:border-emerald-800 dark:text-stone-300"
                  dir="ltr"
                >
                  {formatMenuPrice(netSecondaryCents, secondaryCode)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-center text-[11px] text-stone-500 dark:text-stone-400">
              {discountPreviewCents > 0 ? "المبلغ المستحق بعد خصم النقاط" : "الإجمالي المقدّر للطلب"}
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
