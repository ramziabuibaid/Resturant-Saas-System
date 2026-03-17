"use client";

import { cn } from "@/lib/utils";

/**
 * Placeholder لعرض صنف منيو بدون صورة — حسب DESIGN_SYSTEM.
 * خلفية gradient دافئة من --bg-surface-2 إلى --bg-overlay، أيقونة 🍽️ 32px،
 * border-radius: var(--radius-md). اجعل الحاوية ذات aspect-ratio 4/3 عند الحاجة.
 */
export function MenuItemImagePlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex aspect-[4/3] min-h-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-overlay)]",
        className
      )}
      aria-hidden
    >
      <span className="text-[32px] leading-none" role="img" aria-hidden>
        🍽️
      </span>
    </div>
  );
}
