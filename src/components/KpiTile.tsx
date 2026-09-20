export function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warning" | "critical";
}) {
  const toneColor = tone
    ? {
        good: "var(--status-good)",
        warning: "var(--status-warning)",
        critical: "var(--status-critical)",
      }[tone]
    : "var(--text-primary)";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p
        className="mt-2 text-3xl font-semibold tabular-nums"
        style={{ color: toneColor }}
      >
        {value}
      </p>
    </div>
  );
}
