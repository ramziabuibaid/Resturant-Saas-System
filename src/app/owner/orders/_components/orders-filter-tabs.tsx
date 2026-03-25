"use client";

import type { OrderStatus } from "@/lib/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { FilterIcon } from "lucide-react";

export type OrdersFilterValue = "all" | OrderStatus;

type Props = {
  value: OrdersFilterValue;
  onChange: (v: OrdersFilterValue) => void;
  counts: Record<OrderStatus | "all", number>;
  className?: string;
};

const TABS: { key: OrdersFilterValue; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: ORDER_STATUS_LABELS.pending },
  { key: "accepted", label: ORDER_STATUS_LABELS.accepted },
  { key: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { key: "ready", label: ORDER_STATUS_LABELS.ready },
  { key: "completed", label: ORDER_STATUS_LABELS.completed },
  { key: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export function OrdersFilterTabs({ value, onChange, counts, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex gap-1.5">
          {TABS.map(({ key, label }) => {
            const active = value === key;
            const count = counts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "mr-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 text-[10px] tabular-nums sm:text-xs",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background/80 text-foreground"
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
