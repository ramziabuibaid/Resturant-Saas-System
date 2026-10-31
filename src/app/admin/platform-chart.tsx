"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

/** طلبات المنصة لآخر 14 يوماً */
export function PlatformChart({ daily }: { daily: { day: string; orders: number }[] }) {
  const data = daily.map((d, i) => ({
    ...d,
    label: `${Number(d.day.slice(8))}/${Number(d.day.slice(5, 7))}`,
    isToday: i === daily.length - 1,
  }));

  return (
    <div className="h-52 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            reversed
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
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
            formatter={(value) => [`${value} طلب`, "الطلبات"]}
          />
          <Bar
            dataKey="orders"
            maxBarSize={32}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { isToday: boolean } }) => (
              <rect
                x={props.x}
                y={(props.y ?? 0) + (props.height ?? 0) - Math.max(props.height ?? 0, 4)}
                width={props.width}
                height={Math.max(props.height ?? 0, 4)}
                rx={6}
                fill={props.payload?.isToday ? "var(--brand)" : "color-mix(in oklab, var(--brand) 28%, transparent)"}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
