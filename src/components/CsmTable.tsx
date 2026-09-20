import { csmPerformance } from "@/lib/metrics";
import type { Customer } from "@/lib/types";

export function CsmTable({ customers }: { customers: Customer[] }) {
  const rows = csmPerformance(customers);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)]">
            <th className="px-4 py-2 font-medium">CSM</th>
            <th className="px-4 py-2 text-right font-medium">Accounts</th>
            <th className="px-4 py-2 text-right font-medium">MRR managed</th>
            <th className="px-4 py-2 text-right font-medium">Churn rate</th>
            <th className="px-4 py-2 text-right font-medium">Avg. NPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.csm}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-4 py-2 text-[var(--text-primary)]">{r.csm}</td>
              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                {r.accounts}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-primary)]">
                ${r.mrr.toLocaleString()}
              </td>
              <td
                className="px-4 py-2 text-right tabular-nums"
                style={{
                  color:
                    r.churnRate > 20
                      ? "var(--status-critical)"
                      : "var(--text-secondary)",
                }}
              >
                {r.churnRate.toFixed(0)}%
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                {r.avgNps.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
