export const statusColor: Record<string, string> = {
  Active: "var(--status-good)",
  "At-Risk": "var(--status-warning)",
  Churned: "var(--status-critical)",
};

export const seriesColor = "var(--series-1)";

export const tooltipContentStyle: React.CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-primary)",
};

export const axisTick = { fill: "var(--text-secondary)", fontSize: 12 };
export const gridStroke = "var(--gridline)";
