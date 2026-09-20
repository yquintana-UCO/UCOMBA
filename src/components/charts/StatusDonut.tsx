"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { statusColor, tooltipContentStyle } from "@/lib/chartTheme";

export function StatusDonut({
  data,
}: {
  data: { status: string; count: number; mrr: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          cornerRadius={4}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={statusColor[entry.status] ?? "var(--series-1)"}
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value, _name, item) => {
            const payload = item.payload as { status: string; mrr: number };
            return [
              `${value} customers · $${payload.mrr.toLocaleString()} MRR`,
              payload.status,
            ];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={32}
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
