"use client";

import { pollNewOrders } from "@/app/actions/orders";
import { BellIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  restaurantId: string;
  /** لون/ثيم يطابق لوحة المطعم */
  variant?: "dashboard" | "owner";
};

export function OrderNotificationsBell({ restaurantId, variant = "dashboard" }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [badge, setBadge] = useState(0);
  const onOrdersPage = pathname?.includes("/orders") ?? false;

  useEffect(() => {
    if (!onOrdersPage) return;
    const id = window.setTimeout(() => setBadge(0), 0);
    return () => window.clearTimeout(id);
  }, [onOrdersPage]);

  // استعلام دوري كل 8 ثوانٍ أثناء ظهور الصفحة (بديل Supabase Realtime)
  useEffect(() => {
    if (!restaurantId) return;
    let since: number | null = null;
    let stopped = false;

    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const { latest, newNumbers } = await pollNewOrders(since);
        if (stopped) return;
        if (since !== null && newNumbers.length) {
          for (const num of newNumbers.slice(-3)) {
            toast.success("طلب جديد", { description: `رقم الطلب #${num}` });
          }
          if (pathname?.includes("/orders")) router.refresh();
          else setBadge((c) => Math.min(99, c + newNumbers.length));
        }
        since = latest;
      } catch {
        /* شبكة مؤقتة — المحاولة التالية بعد قليل */
      }
    }

    void tick();
    const id = window.setInterval(tick, 8000);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restaurantId, pathname, router]);

  const bellClass =
    variant === "owner"
      ? "relative inline-flex size-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      : "relative flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]";

  return (
    <button
      type="button"
      className={bellClass}
      aria-label="الإشعارات — طلبات جديدة"
      onClick={() => {
        setBadge(0);
        if (!onOrdersPage) router.push("/admin/orders");
      }}
    >
      <BellIcon className="size-5" />
      {badge > 0 ? (
        <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand,#22c55e)] px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}
