"use client";

import Image from "next/image";
import { useState } from "react";
import { MinusIcon, PlusIcon, Flame } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { parseExcludedIngredients } from "@/lib/order-exclusions";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import type { CartLine } from "@/components/menu-ordering";
import { cn } from "@/lib/utils";

export type PriceContext = {
  currencyCode: string;
  secondaryCode: string | null;
  exchangeRate: number | null;
};

/** ورقة تفاصيل الطبق من الأسفل: صورة كبيرة، الحجم، الكمية، ملاحظات، ثم «أضف» */
export function ItemSheet({
  item,
  onClose,
  onAdd,
  price,
  addLabel,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
  price: PriceContext;
  addLabel: string;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-lg gap-0 overflow-hidden rounded-t-[28px] border-0 p-0"
      >
        {item ? <ItemSheetBody key={item.id} item={item} onAdd={onAdd} onClose={onClose} price={price} addLabel={addLabel} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ItemSheetBody({
  item,
  onAdd,
  onClose,
  price,
  addLabel,
}: {
  item: MenuItem;
  onAdd: (line: CartLine) => void;
  onClose: () => void;
  price: PriceContext;
  addLabel: string;
}) {
  const options = Array.isArray(item.price_options) ? item.price_options : [];
  const [option, setOption] = useState<string | null>(options[0]?.label ?? null);
  const [qty, setQty] = useState(1);
  const [excluded, setExcluded] = useState("");

  const unitCents = options.length ? options.find((o) => o.label === option)?.price_cents ?? 0 : item.price;
  const secondaryUnit =
    price.secondaryCode != null ? resolveSecondaryUnitCents(item, unitCents, option, price.exchangeRate) : null;

  function add() {
    onAdd({
      menuItemId: item.id,
      quantity: qty,
      priceOptionLabel: options.length ? option : null,
      excludedIngredients: parseExcludedIngredients(excluded),
    });
    onClose();
  }

  return (
    <div className="flex max-h-[92dvh] flex-col" dir="rtl">
      <div className="overflow-y-auto">
        {item.image_url ? (
          <div className="relative aspect-[4/3] w-full bg-bg-surface-2">
            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
          </div>
        ) : (
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border-strong" />
        )}

        <div className="space-y-5 p-5">
          <div>
            <SheetTitle className="font-display text-2xl font-bold text-text-primary">{item.name}</SheetTitle>
            {item.description ? (
              <SheetDescription className="mt-2 text-[15px] leading-7 text-text-secondary">{item.description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">تفاصيل الطبق</SheetDescription>
            )}
            {item.calories ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted">
                <Flame className="size-3.5" /> {item.calories}
              </p>
            ) : null}
          </div>

          {options.length > 1 ? (
            <div>
              <p className="mb-2 text-sm font-bold text-text-primary">اختر الحجم</p>
              <div className="grid grid-cols-2 gap-2">
                {options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setOption(o.label)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3 text-start transition",
                      option === o.label
                        ? "border-brand bg-brand-light text-text-primary ring-1 ring-brand"
                        : "border-border bg-bg-surface text-text-secondary hover:border-border-strong"
                    )}
                  >
                    <span className="font-semibold">{o.label}</span>
                    <span className="text-sm font-bold text-brand" dir="ltr">
                      {formatMenuPrice(o.price_cents, price.currencyCode)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="excluded" className="mb-2 block text-sm font-bold text-text-primary">
              بدون مكونات <span className="font-normal text-text-muted">(اختياري)</span>
            </label>
            <input
              id="excluded"
              value={excluded}
              onChange={(e) => setExcluded(e.target.value)}
              placeholder="مثال: بصل، حار، صوص"
              className="h-12 w-full rounded-2xl border border-border bg-bg-surface px-4 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-bg-base p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center rounded-full border border-border bg-bg-surface">
          <button type="button" aria-label="زيادة" onClick={() => setQty((q) => Math.min(99, q + 1))} className="flex size-11 items-center justify-center text-text-primary">
            <PlusIcon className="size-4" />
          </button>
          <span className="min-w-[2ch] text-center font-bold tabular-nums">{qty}</span>
          <button type="button" aria-label="إنقاص" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-11 items-center justify-center text-text-primary">
            <MinusIcon className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex h-12 flex-1 items-center justify-between rounded-full bg-brand px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_var(--brand)] active:scale-[0.98]"
        >
          <span>{addLabel}</span>
          <span className="flex flex-col items-end leading-tight" dir="ltr">
            <span>{formatMenuPrice(unitCents * qty, price.currencyCode)}</span>
            {secondaryUnit != null && price.secondaryCode ? (
              <span className="text-[11px] font-medium opacity-80">{formatMenuPrice(secondaryUnit * qty, price.secondaryCode)}</span>
            ) : null}
          </span>
        </button>
      </div>
    </div>
  );
}
