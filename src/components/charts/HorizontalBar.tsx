"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisTick, gridStroke, seriesColor, tooltipContentStyle } from "@/lib/chartTheme";
import { formatValue, type ValueFormat } from "@/lib/format";

export function HorizontalBar({
  data,
  categoryKey,
  valueKey,
  valueFormat,
  height = 280,
}: {
  data: Record<string, string | number>[];
  categoryKey: string;
  valueKey: string;
  valueFormat?: ValueFormat;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={gridStroke} />
        <XAxis
          type="number"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
          tickFormatter={(v) => formatValue(Number(v), valueFormat)}
        />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [formatValue(Number(value), valueFormat), ""]}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Bar dataKey={valueKey} fill={seriesColor} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
