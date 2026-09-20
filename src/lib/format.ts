export type ValueFormat = "currency" | "count";

export function formatValue(v: number, format?: ValueFormat): string {
  if (format === "currency") return `$${Math.round(v).toLocaleString()}`;
  return v.toLocaleString();
}
