import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
 * أرقام «نظرة عامة» للوحة المطعم — للخادم فقط.
 * «اليوم» بتوقيت فلسطين (السيرفر و Postgres يعملان بـ UTC).
 */
export const RESTAURANT_TZ = "Asia/Hebron";

const ACTIVE = ["pending", "accepted", "preparing", "ready"] as const;

export type DashboardOverview = {
  todayOrders: number;
  todayRevenueCents: number;
  yesterdayRevenueCents: number;
  activeOrders: number;
  avgTicketCents: number;
  week: { day: string; orders: number; revenueCents: number }[];
  topItems: { name: string; qty: number }[];
  recentOrders: {
    id: string;
    displayNumber: number;
    status: string;
    totalCents: number;
    tableLabel: string | null;
    fulfillment: string;
    createdAt: string;
  }[];
  setup: { items: number; categories: number; tables: number; hasLogo: boolean; hasCover: boolean; orders: number };
};

/** المبلغ المدفوع للطلب: مجموع البنود − خصم النقاط − الخصم اليدوي */
const PAYABLE = sql`greatest(0, coalesce((select sum(oi.line_total_cents) from order_items oi where oi.order_id = o.id), 0) - o.loyalty_discount_cents - o.owner_discount_cents)`;

export async function getDashboardOverview(restaurantId: string): Promise<DashboardOverview> {
  const tz = RESTAURANT_TZ;
  const localDay = sql`(o.created_at at time zone ${tz})::date`;
  const today = sql`(now() at time zone ${tz})::date`;

  const [summary, week, topItems, recent, setup] = await Promise.all([
    db.execute<{
      today_orders: number;
      today_revenue: number;
      yesterday_revenue: number;
      active_orders: number;
    }>(sql`
      select
        count(*) filter (where ${localDay} = ${today} and o.status <> 'cancelled')::int as today_orders,
        coalesce(sum(${PAYABLE}) filter (where ${localDay} = ${today} and o.status <> 'cancelled'), 0)::int as today_revenue,
        coalesce(sum(${PAYABLE}) filter (where ${localDay} = ${today} - 1 and o.status <> 'cancelled'), 0)::int as yesterday_revenue,
        count(*) filter (where o.status in (${sql.join(ACTIVE.map((s) => sql`${s}`), sql`, `)}))::int as active_orders
      from orders o
      where o.restaurant_id = ${restaurantId}
        and (o.created_at > now() - interval '3 days'
             or o.status in (${sql.join(ACTIVE.map((s) => sql`${s}`), sql`, `)}))
    `),
    db.execute<{ day: string; orders: number; revenue: number }>(sql`
      with days as (
        select generate_series(${today} - 6, ${today}, interval '1 day')::date as day
      )
      select to_char(d.day, 'YYYY-MM-DD') as day,
             count(o.id)::int as orders,
             coalesce(sum(${PAYABLE}), 0)::int as revenue
      from days d
      left join orders o
        on o.restaurant_id = ${restaurantId}
       and o.status <> 'cancelled'
       and ${localDay} = d.day
      group by d.day
      order by d.day
    `),
    db.execute<{ name: string; qty: number }>(sql`
      select oi.item_name as name, sum(oi.quantity)::int as qty
      from order_items oi
      join orders o on o.id = oi.order_id
      where o.restaurant_id = ${restaurantId}
        and o.status <> 'cancelled'
        and o.created_at > now() - interval '30 days'
      group by oi.item_name
      order by qty desc
      limit 5
    `),
    db.execute<{
      id: string;
      display_number: number;
      status: string;
      total: number;
      table_label: string | null;
      fulfillment: string;
      created_at: string;
    }>(sql`
      select o.id, o.display_number, o.status, ${PAYABLE}::int as total,
             t.label as table_label, o.fulfillment, o.created_at
      from orders o
      left join restaurant_tables t on t.id = o.table_id
      where o.restaurant_id = ${restaurantId}
      order by o.created_at desc
      limit 6
    `),
    db.execute<{ items: number; categories: number; tables: number; has_logo: boolean; has_cover: boolean; orders: number }>(sql`
      select
        (select count(*) from menu_items where restaurant_id = ${restaurantId})::int as items,
        (select count(*) from categories where restaurant_id = ${restaurantId})::int as categories,
        (select count(*) from restaurant_tables where restaurant_id = ${restaurantId})::int as tables,
        (select count(*) from orders where restaurant_id = ${restaurantId})::int as orders,
        coalesce(nullif(trim(r.logo_url), ''), '') <> '' as has_logo,
        coalesce(nullif(trim(r.hero_background_url), ''), '') <> '' as has_cover
      from restaurants r where r.id = ${restaurantId}
    `),
  ]);

  const s = summary[0];
  const st = setup[0];
  return {
    todayOrders: s?.today_orders ?? 0,
    todayRevenueCents: s?.today_revenue ?? 0,
    yesterdayRevenueCents: s?.yesterday_revenue ?? 0,
    activeOrders: s?.active_orders ?? 0,
    avgTicketCents: s?.today_orders ? Math.round(s.today_revenue / s.today_orders) : 0,
    week: week.map((w) => ({ day: w.day, orders: w.orders, revenueCents: w.revenue })),
    topItems: topItems.map((t) => ({ name: t.name, qty: t.qty })),
    recentOrders: recent.map((r) => ({
      id: r.id,
      displayNumber: r.display_number,
      status: r.status,
      totalCents: r.total,
      tableLabel: r.table_label,
      fulfillment: r.fulfillment,
      createdAt: new Date(r.created_at).toISOString(),
    })),
    setup: {
      items: st?.items ?? 0,
      categories: st?.categories ?? 0,
      tables: st?.tables ?? 0,
      hasLogo: st?.has_logo ?? false,
      hasCover: st?.has_cover ?? false,
      orders: st?.orders ?? 0,
    },
  };
}
