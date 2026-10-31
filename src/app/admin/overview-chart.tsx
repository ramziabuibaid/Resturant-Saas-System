"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatMenuPrice } from "@/lib/currencies";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** إيرادات آخر 7 أيام — عمود اليوم بلون الهوية والبقية أخف */
export function OverviewChart({
  week,
  currencyCode,
}: {
  week: { day: string; orders: number; revenueCents: number }[];
  currencyCode: string;
}) {
  const data = week.map((w, i) => ({
    ...w,
    label: i === week.length - 1 ? "اليوم" : DAY_NAMES[new Date(`${w.day}T12:00:00`).getDay()],
    isToday: i === week.length - 1,
  }));

  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            reversed
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-surface-2)" }}
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              direction: "rtl",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
            formatter={(value, _name, item) => [
              `${formatMenuPrice(Number(value), currencyCode)} · ${item.payload.orders} طلب`,
              "الإيراد",
            ]}
          />
          <Bar
            dataKey="revenueCents"
            radius={[8, 8, 8, 8]}
            maxBarSize={44}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { isToday: boolean } }) => (
              <rect
                x={props.x}
                y={props.y}
                width={props.width}
                height={Math.max(props.height ?? 0, 4)}
                rx={8}
                fill={props.payload?.isToday ? "var(--brand)" : "color-mix(in oklab, var(--brand) 28%, transparent)"}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
