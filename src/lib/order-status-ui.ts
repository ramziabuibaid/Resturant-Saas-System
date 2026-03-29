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

/** ألوان الواجهة: حدود وخلفية خفيفة (Tailwind classes) */
export function orderStatusCardClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "border-emerald-500/50 bg-emerald-950/25 order-card-pulse-pending";
    case "accepted":
      return "border-sky-500/40 bg-sky-950/20 order-card-pulse-accepted";
    case "preparing":
      return "border-amber-500/50 bg-amber-950/25 order-card-pulse-preparing";
    case "ready":
      return "border-blue-500/50 bg-blue-950/25 shadow-[inset_4px_0_0_0_rgba(59,130,246,0.65)]";
    case "completed":
      return "border-zinc-500/40 bg-zinc-900/40 shadow-[inset_4px_0_0_0_rgba(113,113,122,0.5)]";
    case "cancelled":
      return "border-red-500/45 bg-red-950/25 shadow-[inset_4px_0_0_0_rgba(239,68,68,0.55)]";
    default:
      return "border-border bg-card";
  }
}

export function orderStatusBadgeClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-emerald-600/90 text-white";
    case "accepted":
      return "bg-sky-600/90 text-white";
    case "preparing":
      return "bg-amber-600/90 text-white";
    case "ready":
      return "bg-blue-600/90 text-white";
    case "completed":
      return "bg-zinc-600/90 text-white";
    case "cancelled":
      return "bg-red-600/90 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** الخطوة التالية المنطقية في التشغيل (للزر السريع) */
export function nextOperationalStatus(current: OrderStatus): OrderStatus | null {
  if (current === "cancelled" || current === "completed") return null;
  const i = ORDER_STATUS_FLOW.indexOf(current);
  if (i === -1) return current === "pending" ? "accepted" : null;
  if (i >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[i + 1]!;
}
