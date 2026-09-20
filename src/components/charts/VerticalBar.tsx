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

export function VerticalBar({
  data,
  categoryKey,
  valueKey,
  valueFormat,
}: {
  data: Record<string, string | number>[];
  categoryKey: string;
  valueKey: string;
  valueFormat?: ValueFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis
          dataKey={categoryKey}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatValue(Number(v), valueFormat)}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [formatValue(Number(value), valueFormat), ""]}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Bar dataKey={valueKey} fill={seriesColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
