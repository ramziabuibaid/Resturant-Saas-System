"use client";

import { useState } from "react";
import type { GuestOrderWithDetails, OrderStatus } from "@/lib/types/database";
import { updateOrderStatus } from "@/app/actions/orders";
import { formatMenuPrice } from "@/lib/currencies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "مستجد",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز",
  completed: "مكتمل",
  cancelled: "ملغى",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  dine_in: "داخل المطعم",
  pickup: "استلام",
  delivery: "توصيل",
};

type Props = {
  initialOrders: GuestOrderWithDetails[];
  currencyCode: string;
};

export function OrdersClient({ initialOrders, currencyCode }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [updating, setUpdating] = useState<string | null>(null);

  async function setStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId);
    const res = await updateOrderStatus(orderId, status);
    setUpdating(null);
    if (res.error) {
      alert(res.error);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">لا توجد طلبات بعد.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const total = o.items.reduce((s, i) => s + i.line_total_cents, 0);
            return (
              <li key={o.id}>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                    <div>
                      <CardTitle className="text-base">
                        طلب —{" "}
                        <span dir="ltr" className="tabular-nums">
                          {new Date(o.created_at).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                            hour12: false,
                          })}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-0.5">
                        <span dir="ltr" className="block font-medium text-foreground">
                          جوال: {o.customer_phone}
                        </span>
                        <span>
                          {FULFILLMENT_LABELS[o.fulfillment] ?? o.fulfillment}
                          {o.table_label ? ` — الطاولة: ${o.table_label}` : ""}
                        </span>
                        {o.delivery_address ? (
                          <span className="block text-xs">العنوان: {o.delivery_address}</span>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-lg font-bold tabular-nums" dir="ltr">
                        {formatMenuPrice(total, currencyCode)}
                      </span>
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        value={o.status}
                        disabled={updating === o.id}
                        onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                      >
                        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="border-t pt-3">
                    <ul className="space-y-1 text-sm">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span>
                            {i.menu_item_name ?? "صنف"}
                            {i.price_option_label ? ` (${i.price_option_label})` : ""} × {i.quantity}
                          </span>
                          <span dir="ltr" className="tabular-nums text-muted-foreground">
                            {formatMenuPrice(i.line_total_cents, currencyCode)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
