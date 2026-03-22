"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuItem, OrderFulfillment, Restaurant } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { createGuestOrder } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ShoppingBagIcon, PlusIcon, MinusIcon, Trash2Icon } from "lucide-react";

export type CartLine = {
  menuItemId: string;
  quantity: number;
  priceOptionLabel: string | null;
};

export type TableContext = {
  fromQr: { id: string; label: string } | null;
  /** من query ?t= */
  token: string | null;
  publicTables: { id: string; label: string }[];
};

function lineKey(menuItemId: string, priceOptionLabel: string | null) {
  return `${menuItemId}::${priceOptionLabel ?? ""}`;
}

export function AddItemButton({
  item,
  unavailable,
  onAdd,
}: {
  item: MenuItem;
  unavailable: boolean;
  onAdd: (line: CartLine) => void;
}) {
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<string>("");
  const [qty, setQty] = useState(1);
  const opts = item.price_options;
  const hasOptions = opts && Array.isArray(opts) && opts.length > 0;

  function confirm() {
    if (hasOptions && !option) return;
    onAdd({
      menuItemId: item.id,
      quantity: qty,
      priceOptionLabel: hasOptions ? option : null,
    });
    setOpen(false);
    setQty(1);
    setOption("");
  }

  if (unavailable) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="default"
        className="mt-2 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        onClick={() => {
          if (hasOptions) {
            setOption(opts![0]!.label);
            setOpen(true);
          } else {
            onAdd({ menuItemId: item.id, quantity: 1, priceOptionLabel: null });
          }
        }}
      >
        <PlusIcon className="size-4" />
        أضف للسلة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" scrollable>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>اختر الحجم أو الكمية ثم أضف للسلة.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            {hasOptions && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400">الخيار</label>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
                  value={option}
                  onChange={(e) => setOption(e.target.value)}
                >
                  {opts!.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
          </div>
          <DialogFooter className="border-t-0 p-4 pt-0 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={confirm} disabled={Boolean(hasOptions && !option)}>
              أضف للسلة
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
  onCheckout,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  currencyCode: string;
  onCheckout: () => void;
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

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-stone-950/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {cart.reduce((s, l) => s + l.quantity, 0)} صنف في السلة
          </p>
          <p className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-50" dir="ltr">
            {formatMenuPrice(totalCents, currencyCode)}
          </p>
        </div>
        <Button type="button" size="lg" className="shrink-0 gap-2" onClick={onCheckout}>
          <ShoppingBagIcon className="size-5" />
          إتمام الطلب
        </Button>
      </div>
    </div>
  );
}

export function CartLinesEditor({
  cart,
  setCart,
  menuById,
  currencyCode,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  menuById: Map<string, MenuItem>;
  currencyCode: string;
}) {
  return (
    <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
      {cart.map((line) => {
        const item = menuById.get(line.menuItemId);
        if (!item) return null;
        const key = lineKey(line.menuItemId, line.priceOptionLabel);
        const r = resolveUnitPriceCents(item, line.priceOptionLabel);
        const unit = r.ok ? r.cents : 0;
        return (
          <li
            key={key}
            className="flex items-center justify-between gap-2 rounded-lg border border-stone-200/80 bg-stone-50/80 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              {line.priceOptionLabel ? (
                <p className="text-[11px] text-stone-500">{line.priceOptionLabel}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="icon-xs"
                variant="outline"
                onClick={() =>
                  setCart((prev) => {
                    const i = prev.findIndex(
                      (l) =>
                        l.menuItemId === line.menuItemId &&
                        l.priceOptionLabel === line.priceOptionLabel
                    );
                    if (i < 0) return prev;
                    const copy = [...prev];
                    if (copy[i].quantity <= 1) copy.splice(i, 1);
                    else copy[i] = { ...copy[i], quantity: copy[i].quantity - 1 };
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
                    const i = prev.findIndex(
                      (l) =>
                        l.menuItemId === line.menuItemId &&
                        l.priceOptionLabel === line.priceOptionLabel
                    );
                    if (i < 0) return prev;
                    const copy = [...prev];
                    copy[i] = { ...copy[i], quantity: Math.min(99, copy[i].quantity + 1) };
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
                onClick={() =>
                  setCart((prev) =>
                    prev.filter(
                      (l) =>
                        !(
                          l.menuItemId === line.menuItemId &&
                          l.priceOptionLabel === line.priceOptionLabel
                        )
                    )
                  )
                }
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
            <span className="text-xs tabular-nums text-stone-600 dark:text-stone-300" dir="ltr">
              {formatMenuPrice(unit * line.quantity, currencyCode)}
            </span>
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

  useEffect(() => {
    if (!open) {
      setSuccess(false);
      setMessage(null);
    }
  }, [open]);

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
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
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
        {success ? (
          <>
            <DialogHeader className="p-4 pb-0">
              <DialogTitle>تم استلام طلبك</DialogTitle>
              <DialogDescription>
                سيصل الطلب إلى المطعم مباشرة. شكراً لثقتك بنا.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-4 pt-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setSuccess(false);
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

          <CartLinesEditor
            cart={cart}
            setCart={setCart}
            menuById={menuById}
            currencyCode={currencyCode}
          />

          <p className="text-end text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100" dir="ltr">
            الإجمالي: {formatMenuPrice(totalCents, currencyCode)}
          </p>

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
