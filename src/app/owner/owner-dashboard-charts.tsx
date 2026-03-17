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

type OwnerStats = {
  categoriesCount: number;
  menuItemsCount: number;
};

const COLORS = ["var(--chart-1)", "var(--chart-2)"];

export function OwnerDashboardCharts({ stats }: { stats: OwnerStats }) {
  const barData = [
    { name: "Categories", count: stats.categoriesCount },
    { name: "Menu items", count: stats.menuItemsCount },
  ];

  const pieData = [
    { name: "Categories", value: stats.categoriesCount, color: COLORS[0] },
    { name: "Menu items", value: stats.menuItemsCount, color: COLORS[1] },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Menu overview</CardTitle>
          <CardDescription>Categories and items count</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px]">
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
              <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Content mix</CardTitle>
          <CardDescription>Categories vs menu items</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px]">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
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
              Add categories and menu items to see the chart
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
