"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, gridStroke, statusColor, tooltipContentStyle } from "@/lib/chartTheme";

export function UsageByStatusBar({
  data,
}: {
  data: { status: string; avgUsage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis
          dataKey="status"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [`${Number(value).toFixed(0)} / 100`, "Avg. usage score"]}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Bar dataKey="avgUsage" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={statusColor[entry.status] ?? "var(--series-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
