"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Category,
  GuestOrderWithDetails,
  MenuItem,
  OrderStatus,
} from "@/lib/types/database";
import {
  addOrderItemFromMenu,
  applyOwnerLoyaltyRedeemToOrder,
  removeOrderItem,
  setOrderOwnerDiscount,
  updateOrderItemQuantity,
  updateOrderStaffNotes,
  updateOrderStatus,
  updateOrderWaiter,
} from "@/app/actions/orders";
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
  /** فلاتر الطاولة والويتر تظهر فقط عند تفعيل النظام من الإعدادات */
  waitersSystemEnabled?: boolean;
  tablesForFilter?: { id: string; label: string }[];
  waitersForFilter?: { id: string; name: string }[];
  menuItems: MenuItem[];
  categories: Category[];
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
  waitersSystemEnabled = false,
  tablesForFilter = [],
  waitersForFilter = [],
  menuItems,
  categories,
}: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  const [ownerRedeemingId, setOwnerRedeemingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrdersFilterValue>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tableFilterId, setTableFilterId] = useState("");
  const [waiterFilterId, setWaiterFilterId] = useState("");
  const [assigningWaiterOrderId, setAssigningWaiterOrderId] = useState<string | null>(null);
  const [staffSavingKey, setStaffSavingKey] = useState<string | null>(null);

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
    const q = deferredSearch;
    const qDigits = normalizeDigits(q);
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (waitersSystemEnabled) {
        if (tableFilterId && o.table_id !== tableFilterId) return false;
        if (waiterFilterId && o.table_waiter_id !== waiterFilterId) return false;
      }
      if (!q) return true;
      if (String(o.display_number).includes(q)) return true;
      if (qDigits.length >= 3 && normalizeDigits(o.customer_phone).includes(qDigits)) return true;
      return false;
    });
  }, [
    orders,
    filter,
    deferredSearch,
    waitersSystemEnabled,
    tableFilterId,
    waiterFilterId,
  ]);

  const detailOrder = detailId ? orders.find((x) => x.id === detailId) ?? null : null;

  async function handleOwnerApplyLoyaltyRedeem(orderId: string) {
    const ok = window.confirm(
      "تأكيد تطبيق أقصى خصم بالنقاط على هذا الطلب؟ سيتم خصم النقاط من رصيد الزبون تلقائياً."
    );
    if (!ok) return;
    setOwnerRedeemingId(orderId);
    const res = await applyOwnerLoyaltyRedeemToOrder(orderId);
    setOwnerRedeemingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`تم تطبيق الخصم على الطلب: ${res.pointsRedeemed} نقطة مستبدَلة.`);
    router.refresh();
  }

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

  async function handleSaveStaffNotes(orderId: string, notes: string) {
    setStaffSavingKey("notes");
    const res = await updateOrderStaffNotes(orderId, notes);
    setStaffSavingKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("تم حفظ الملاحظات.");
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, staff_notes: notes || null } : o))
    );
    router.refresh();
  }

  async function handleSaveOwnerDiscount(orderId: string, discountCents: number) {
    setStaffSavingKey("discount");
    const res = await setOrderOwnerDiscount(orderId, discountCents);
    setStaffSavingKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("تم تحديث الخصم.");
    router.refresh();
  }

  async function handleAddOrderItem(
    orderId: string,
    input: { menuItemId: string; quantity: number; priceOptionLabel: string | null }
  ) {
    setStaffSavingKey("add");
    const res = await addOrderItemFromMenu({ orderId, ...input });
    setStaffSavingKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("تمت إضافة الصنف.");
    router.refresh();
  }

  async function handleChangeOrderItemQty(
    orderId: string,
    orderItemId: string,
    quantity: number
  ) {
    setStaffSavingKey(`q-${orderItemId}`);
    const res = await updateOrderItemQuantity(orderItemId, quantity);
    setStaffSavingKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  async function handleRemoveOrderItem(_orderId: string, orderItemId: string) {
    setStaffSavingKey(`d-${orderItemId}`);
    const res = await removeOrderItem(orderItemId);
    setStaffSavingKey(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("تم حذف الصنف.");
    router.refresh();
  }

  async function handleAssignWaiter(orderId: string, waiterId: string | null) {
    setAssigningWaiterOrderId(orderId);
    const res = await updateOrderWaiter(orderId, waiterId);
    setAssigningWaiterOrderId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (waiterId) {
      const name = waitersForFilter.find((w) => w.id === waiterId)?.name ?? null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                waiter_id: waiterId,
                table_waiter_id: waiterId,
                waiter_name: name,
              }
            : o
        )
      );
    }

    toast.success(
      waiterId ? "تم تعيين الويتر على الطلب." : "تم الاعتماد على ويتر الطاولة (إن وُجد)."
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <OrdersFilterTabs value={filter} onChange={setFilter} counts={counts} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {waitersSystemEnabled ? (
          <div className="flex w-full max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="filter-table">
              تصفية حسب الطاولة
            </label>
            <select
              id="filter-table"
              className="h-10 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
              value={tableFilterId}
              onChange={(e) => setTableFilterId(e.target.value)}
            >
              <option value="">كل الطاولات</option>
              {tablesForFilter.map((t) => (
                <option key={t.id} value={t.id}>
                  الطاولة: {t.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-waiter">
              تصفية حسب الويتر
            </label>
            <select
              id="filter-waiter"
              className="h-10 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
              value={waiterFilterId}
              onChange={(e) => setWaiterFilterId(e.target.value)}
            >
              <option value="">كل الويترز</option>
              {waitersForFilter.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Input
          placeholder="بحث برقم الطلب أو أرقام الجوال…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          dir="ltr"
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          spellCheck={false}
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
                onOwnerApplyLoyaltyRedeem={handleOwnerApplyLoyaltyRedeem}
                ownerRedeeming={ownerRedeemingId === o.id}
                waitersSystemEnabled={waitersSystemEnabled}
                waitersForFilter={waitersForFilter}
                onAssignWaiter={waitersSystemEnabled ? handleAssignWaiter : undefined}
                assigningWaiterOrderId={assigningWaiterOrderId}
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
        onOwnerApplyLoyaltyRedeem={handleOwnerApplyLoyaltyRedeem}
        ownerRedeeming={detailOrder ? ownerRedeemingId === detailOrder.id : false}
        waitersSystemEnabled={waitersSystemEnabled}
        waitersForFilter={waitersForFilter}
        onAssignWaiter={waitersSystemEnabled ? handleAssignWaiter : undefined}
        assigningWaiterOrderId={assigningWaiterOrderId}
        menuItems={menuItems}
        categories={categories}
        staffSavingKey={staffSavingKey}
        onSaveStaffNotes={handleSaveStaffNotes}
        onSaveOwnerDiscount={handleSaveOwnerDiscount}
        onAddOrderItem={handleAddOrderItem}
        onChangeOrderItemQty={handleChangeOrderItemQty}
        onRemoveOrderItem={handleRemoveOrderItem}
      />
    </div>
  );
}
