"use client";

import { useMemo, useState } from "react";
import type { Customer, CustomerStatus } from "@/lib/types";
import { statusColor } from "@/lib/chartTheme";

const STATUSES: CustomerStatus[] = ["Active", "At-Risk", "Churned"];

type SortKey = "company_name" | "mrr" | "nps_score" | "product_usage_score";

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "All">(
    "All",
  );
  const [industryFilter, setIndustryFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [sortDesc, setSortDesc] = useState(true);

  const industries = useMemo(
    () =>
      Array.from(
        new Set(customers.map((c) => c.industry).filter(Boolean)),
      ).sort() as string[],
    [customers],
  );

  const filtered = useMemo(() => {
    let rows = customers;
    if (statusFilter !== "All") {
      rows = rows.filter((c) => c.status === statusFilter);
    }
    if (industryFilter !== "All") {
      rows = rows.filter((c) => c.industry === industryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.customer_id.toLowerCase().includes(q) ||
          (c.csm_name ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? (typeof a[sortKey] === "string" ? "" : 0);
      const bv = b[sortKey] ?? (typeof b[sortKey] === "string" ? "" : 0);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return sortDesc ? Number(bv) - Number(av) : Number(av) - Number(bv);
    });
    return sorted;
  }, [customers, statusFilter, industryFilter, search, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search company, ID, or CSM…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)]"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as CustomerStatus | "All")
          }
          className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          <option value="All">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          <option value="All">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--text-muted)]">
          {filtered.length} of {customers.length} customers
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-secondary)]">
              <Th label="Company" onClick={() => toggleSort("company_name")} />
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Industry</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <Th label="MRR" onClick={() => toggleSort("mrr")} align="right" />
              <Th
                label="Usage"
                onClick={() => toggleSort("product_usage_score")}
                align="right"
              />
              <Th label="NPS" onClick={() => toggleSort("nps_score")} align="right" />
              <th className="px-4 py-2 font-medium">CSM</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.customer_id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--page-plane)]"
              >
                <td className="px-4 py-2 text-[var(--text-primary)]">
                  {c.company_name}
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {c.customer_id}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: statusColor[c.status] }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: statusColor[c.status] }}
                    />
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">
                  {c.industry ?? "—"}
                </td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">
                  {c.plan ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-primary)]">
                  ${(c.mrr ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                  {c.product_usage_score ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                  {c.nps_score ?? "—"}
                </td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">
                  {c.csm_name ?? "Unassigned"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No customers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  onClick,
  align = "left",
}: {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 font-medium hover:text-[var(--text-primary)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={onClick}
    >
      {label}
    </th>
  );
}
