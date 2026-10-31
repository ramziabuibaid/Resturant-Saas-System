import { sql } from "drizzle-orm";
import { db } from "@/db";
import { RESTAURANT_TZ } from "@/lib/data/dashboard";

/*
 * أرقام لوحة مالك النظام — للخادم فقط.
 * لا تتحقق من الصلاحية: الصفحة المستدعية مسؤولة عن requireSuperAdmin / getAdminContext.
 */

export type PlatformRestaurantRow = {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "trial" | "suspended";
  logoUrl: string | null;
  createdAt: string;
  ownerUsername: string | null;
  items: number;
  tables: number;
  orders30d: number;
  ordersToday: number;
  lastOrderAt: string | null;
};

export type PlatformOverview = {
  restaurants: PlatformRestaurantRow[];
  ordersToday: number;
  orders30d: number;
  customers: number;
  /** عدد الطلبات لكل يوم — آخر 14 يوماً */
  daily: { day: string; orders: number }[];
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const tz = RESTAURANT_TZ;
  const today = sql`(now() at time zone ${tz})::date`;

  const [restaurants, totals, daily] = await Promise.all([
    db.execute<{
      id: string;
      name: string;
      subdomain: string;
      status: PlatformRestaurantRow["status"];
      logo_url: string | null;
      created_at: Date;
      owner_username: string | null;
      items: number;
      tables: number;
      orders_30d: number;
      orders_today: number;
      last_order_at: Date | null;
    }>(sql`
      select r.id, r.name, r.subdomain, r.status, r.logo_url, r.created_at,
        (select u.username from users u where u.restaurant_id = r.id and u.role = 'owner' limit 1) as owner_username,
        (select count(*)::int from menu_items m where m.restaurant_id = r.id) as items,
        (select count(*)::int from restaurant_tables t where t.restaurant_id = r.id) as tables,
        (select count(*)::int from orders o where o.restaurant_id = r.id and o.created_at > now() - interval '30 days') as orders_30d,
        (select count(*)::int from orders o where o.restaurant_id = r.id and (o.created_at at time zone ${tz})::date = ${today}) as orders_today,
        (select max(o.created_at) from orders o where o.restaurant_id = r.id) as last_order_at
      from restaurants r
      order by r.created_at desc
    `),
    db.execute<{ orders_today: number; orders_30d: number; customers: number }>(sql`
      select
        (select count(*)::int from orders o where (o.created_at at time zone ${tz})::date = ${today}) as orders_today,
        (select count(*)::int from orders o where o.created_at > now() - interval '30 days') as orders_30d,
        (select count(*)::int from customers) as customers
    `),
    db.execute<{ day: string; orders: number }>(sql`
      select to_char(d, 'YYYY-MM-DD') as day,
        (select count(*)::int from orders o where (o.created_at at time zone ${tz})::date = d) as orders
      from generate_series(${today} - 13, ${today}, interval '1 day') as g(d)
    `),
  ]);

  const t = totals[0];
  return {
    restaurants: restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      subdomain: r.subdomain,
      status: r.status,
      logoUrl: r.logo_url,
      createdAt: new Date(r.created_at).toISOString(),
      ownerUsername: r.owner_username,
      items: r.items,
      tables: r.tables,
      orders30d: r.orders_30d,
      ordersToday: r.orders_today,
      lastOrderAt: r.last_order_at ? new Date(r.last_order_at).toISOString() : null,
    })),
    ordersToday: t?.orders_today ?? 0,
    orders30d: t?.orders_30d ?? 0,
    customers: t?.customers ?? 0,
    daily: daily.map((d) => ({ day: d.day, orders: d.orders })),
  };
}
