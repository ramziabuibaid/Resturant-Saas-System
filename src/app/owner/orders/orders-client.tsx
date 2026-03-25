"use client";

import { useMemo, useState } from "react";
import type { GuestOrderWithDetails, OrderStatus } from "@/lib/types/database";
import { updateOrderStatus } from "@/app/actions/orders";
import { Input } from "@/components/ui/input";
import { OrderCard } from "./_components/order-card";
import { OrderDetailSheet } from "./_components/order-detail-sheet";
import { OrdersFilterTabs, type OrdersFilterValue } from "./_components/orders-filter-tabs";
import { toast } from "sonner";

type Props = {
  initialOrders: GuestOrderWithDetails[];
  currencyCode: string;
  secondaryCurrencyCode?: string | null;
  secondaryExchangeRate?: number | null;
  phoneCountryPrefix: string | null;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
};

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function OrdersClient({
  initialOrders,
  currencyCode,
  secondaryCurrencyCode = null,
  secondaryExchangeRate = null,
  phoneCountryPrefix,
  subdomain,
  publicBaseUrl,
  restaurantName,
}: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrdersFilterValue>("all");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rateRaw =
    secondaryExchangeRate != null ? Number(secondaryExchangeRate) : NaN;
  const showSecondary =
    Boolean(secondaryCurrencyCode) &&
    Number.isFinite(rateRaw) &&
    rateRaw > 0;
  const rate = showSecondary ? rateRaw : NaN;

  const counts = useMemo(() => {
    const c: Record<OrderStatus | "all", number> = {
      all: orders.length,
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      c[o.status] += 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const qDigits = normalizeDigits(q);
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      if (String(o.display_number).includes(q)) return true;
      if (qDigits.length >= 3 && normalizeDigits(o.customer_phone).includes(qDigits)) return true;
      return false;
    });
  }, [orders, filter, search]);

  const detailOrder = detailId ? orders.find((x) => x.id === detailId) ?? null : null;

  async function setStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId);
    const res = await updateOrderStatus(orderId, status);
    setUpdating(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  return (
    <div className="space-y-6">
      <OrdersFilterTabs value={filter} onChange={setFilter} counts={counts} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="بحث برقم الطلب أو أرقام الجوال…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          dir="ltr"
        />
        <p
          dir="rtl"
          className="text-sm text-muted-foreground"
        >
          <span className="text-foreground/80">المعروض من الطلبات:</span>{" "}
          <span
            dir="ltr"
            className="inline-block tabular-nums font-medium text-foreground"
            style={{ unicodeBidi: "isolate" }}
          >
            {filtered.length} / {orders.length}
          </span>
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">لا توجد طلبات بعد.</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground">لا توجد طلبات تطابق التصفية.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((o) => (
            <li key={o.id}>
              <OrderCard
                order={o}
                currencyCode={currencyCode}
                showSecondary={showSecondary}
                rate={rate}
                secondaryCurrencyCode={secondaryCurrencyCode}
                updating={updating === o.id}
                onStatusChange={setStatus}
                onOpenDetails={() => setDetailId(o.id)}
                phoneCountryPrefix={phoneCountryPrefix}
                subdomain={subdomain}
                publicBaseUrl={publicBaseUrl}
                restaurantName={restaurantName}
              />
            </li>
          ))}
        </ul>
      )}

      <OrderDetailSheet
        order={detailOrder}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        currencyCode={currencyCode}
        showSecondary={showSecondary}
        rate={rate}
        secondaryCurrencyCode={secondaryCurrencyCode}
        updating={detailOrder ? updating === detailOrder.id : false}
        onStatusChange={setStatus}
        phoneCountryPrefix={phoneCountryPrefix}
        subdomain={subdomain}
        publicBaseUrl={publicBaseUrl}
        restaurantName={restaurantName}
      />
    </div>
  );
}
