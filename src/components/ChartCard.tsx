export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
