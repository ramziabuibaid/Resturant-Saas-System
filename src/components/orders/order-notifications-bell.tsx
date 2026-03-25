"use client";

import { createClient } from "@/lib/supabase/client";
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

  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`orders-insert-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; display_number?: number } | null;
          const num = row?.display_number;
          toast.success("طلب جديد", {
            description:
              typeof num === "number" ? `رقم الطلب #${num}` : "وصل طلباً جديداً إلى المنيو",
          });
          if (pathname?.includes("/orders")) {
            router.refresh();
          } else {
            setBadge((c) => (c < 99 ? c + 1 : c));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
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
        if (!onOrdersPage) router.push(pathname?.startsWith("/owner") ? "/owner/orders" : "/admin/orders");
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
