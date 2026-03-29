"use client";

import { buildThermalOrderReceiptHtml } from "@/lib/thermal-order-receipt-html";
import type { GuestOrderWithDetails } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";
import { toast } from "sonner";

export function printThermalOrderReceipt(
  order: GuestOrderWithDetails,
  opts: { restaurantName: string; currencyCode: string }
) {
  const html = buildThermalOrderReceiptHtml(order, opts);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "طباعة إيصال حراري");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;inset-inline-end:0;inset-block-end:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    toast.error("تعذّر تهيئة الطباعة.");
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const run = () => {
    try {
      win.focus();
      win.print();
    } catch {
      toast.error("تعذّر إرسال الطلب للطابعة.");
    }
    setTimeout(cleanup, 900);
  };

  setTimeout(run, 120);
}

type BtnProps = {
  order: GuestOrderWithDetails;
  restaurantName: string;
  currencyCode: string;
  className?: string;
  /** زر مدمج في البطاقة */
  compact?: boolean;
};

export function OrderThermalPrintButton({
  order,
  restaurantName,
  currencyCode,
  className,
  compact = false,
}: BtnProps) {
  return (
    <button
      type="button"
      onClick={() =>
        printThermalOrderReceipt(order, { restaurantName, currencyCode })
      }
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-all duration-200",
        "border border-amber-950/25 bg-gradient-to-br from-amber-50 via-orange-50/90 to-stone-100",
        "text-amber-950 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_2px_8px_rgba(180,83,9,0.12)]",
        "hover:-translate-y-0.5 hover:border-amber-900/35 hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_20px_rgba(180,83,9,0.18)]",
        "active:translate-y-0 active:shadow-inner",
        "dark:border-amber-500/25 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-stone-950/60",
        "dark:text-amber-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_2px_12px_rgba(0,0,0,0.45)]",
        "dark:hover:border-amber-400/35 dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_28px_rgba(0,0,0,0.55)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
        compact ? "min-h-9 px-3 py-2 text-xs" : "min-h-10 px-4 py-2.5 text-sm",
        className
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(120,53,15,0.04) 4px, rgba(120,53,15,0.04) 5px)",
        }}
      />
      <span
        className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-950/10 text-amber-950 dark:bg-amber-400/15 dark:text-amber-50"
        aria-hidden
      >
        <Printer className="size-4" strokeWidth={2.25} />
      </span>
      <span className="relative text-start leading-tight">
        <span className="block tracking-tight">طباعة إيصال</span>
        {!compact ? (
          <span className="mt-0.5 block text-[10px] font-normal opacity-75 dark:opacity-80">
            جاهز للطابعة الحرارية (٨٠مم)
          </span>
        ) : null}
      </span>
    </button>
  );
}
