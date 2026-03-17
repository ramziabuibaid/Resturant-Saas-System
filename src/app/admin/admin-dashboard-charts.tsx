"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Stats = {
  totalRestaurants: number;
  activeRestaurants: number;
  totalMenuItems: number;
};

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function AdminDashboardCharts({ stats }: { stats: Stats }) {
  const barData = [
    { name: "Restaurants", total: stats.totalRestaurants, active: stats.activeRestaurants },
    { name: "Menu items", total: stats.totalMenuItems, active: 0 },
  ];

  const pieData = [
    { name: "Active", value: stats.activeRestaurants, color: CHART_COLORS[0] },
    {
      name: "Other",
      value: Math.max(0, stats.totalRestaurants - stats.activeRestaurants),
      color: CHART_COLORS[1],
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>المطاعم</CardTitle>
          <CardDescription>الإجمالي مقابل النشطة</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Total" />
              {stats.totalRestaurants > 0 && (
                <Bar dataKey="active" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Active" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>حالة المطاعم</CardTitle>
          <CardDescription>نشط مقابل أخرى</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              لا توجد بيانات مطاعم بعد
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
