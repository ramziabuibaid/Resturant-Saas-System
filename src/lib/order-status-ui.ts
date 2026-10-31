import type { OrderStatus } from "@/lib/types/database";

/** تسميات عربية للحالات */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "مستجد",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز",
  completed: "مكتمل",
  cancelled: "ملغى",
};

/** ترتيب سير العمل للأزرار السريعة */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "completed",
];

/** بطاقة الطلب: خلفية محايدة + شريط جانبي بلون الحالة */
export function orderStatusCardClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "border-s-brand ring-1 ring-brand/30 order-card-pulse-pending";
    case "accepted":
      return "border-s-sky-500";
    case "preparing":
      return "border-s-amber-500";
    case "ready":
      return "border-s-emerald-500";
    case "completed":
      return "border-s-border-strong opacity-80";
    case "cancelled":
      return "border-s-red-400 opacity-70";
    default:
      return "border-s-border";
  }
}

/** شارة الحالة (هادئة في الوضعين) */
export function orderStatusBadgeClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-brand text-white";
    case "accepted":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300";
    case "preparing":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
    case "ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "completed":
      return "bg-bg-surface-2 text-text-secondary";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    default:
      return "bg-bg-surface-2 text-text-muted";
  }
}

export function nextOperationalStatus(current: OrderStatus): OrderStatus | null {
  if (current === "cancelled" || current === "completed") return null;
  const i = ORDER_STATUS_FLOW.indexOf(current);
  if (i === -1) return current === "pending" ? "accepted" : null;
  if (i >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[i + 1]!;
}
