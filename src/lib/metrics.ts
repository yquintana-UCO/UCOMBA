import type { Customer, CustomerStatus } from "./types";

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function num(v: number | null): number {
  return v ?? 0;
}

export function computeKpis(customers: Customer[]) {
  const active = customers.filter((c) => c.status === "Active");
  const atRisk = customers.filter((c) => c.status === "At-Risk");
  const churned = customers.filter((c) => c.status === "Churned");

  const currentMrr = [...active, ...atRisk].reduce(
    (sum, c) => sum + num(c.mrr),
    0,
  );
  const atRiskMrr = atRisk.reduce((sum, c) => sum + num(c.mrr), 0);
  const churnRate =
    active.length + atRisk.length + churned.length > 0
      ? (churned.length / (active.length + atRisk.length + churned.length)) *
        100
      : 0;
  const avgNps = avg(
    customers
      .map((c) => c.nps_score)
      .filter((n): n is number => n !== null && n !== undefined),
  );

  return {
    totalCustomers: customers.length,
    activeCount: active.length,
    atRiskCount: atRisk.length,
    churnedCount: churned.length,
    currentMrr,
    atRiskMrr,
    churnRate,
    avgNps,
  };
}

export function mrrByStatus(customers: Customer[]) {
  const statuses: CustomerStatus[] = ["Active", "At-Risk", "Churned"];
  return statuses.map((status) => {
    const rows = customers.filter((c) => c.status === status);
    return {
      status,
      count: rows.length,
      mrr: rows.reduce((sum, c) => sum + num(c.mrr), 0),
    };
  });
}

export function mrrByIndustry(customers: Customer[]) {
  const map = new Map<string, { mrr: number; count: number }>();
  for (const c of customers) {
    const key = c.industry ?? "Unknown";
    const entry = map.get(key) ?? { mrr: 0, count: 0 };
    entry.mrr += num(c.mrr);
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([industry, v]) => ({ industry, ...v }))
    .sort((a, b) => b.mrr - a.mrr);
}

export function churnReasonBreakdown(customers: Customer[]) {
  const churned = customers.filter((c) => c.status === "Churned");
  const map = new Map<string, number>();
  for (const c of churned) {
    const key = c.churn_reason ?? "Not recorded";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export function usageScoreByStatus(customers: Customer[]) {
  const statuses: CustomerStatus[] = ["Active", "At-Risk", "Churned"];
  return statuses.map((status) => {
    const rows = customers.filter((c) => c.status === status);
    const scores = rows
      .map((c) => c.product_usage_score)
      .filter((n): n is number => n !== null && n !== undefined);
    return { status, avgUsage: avg(scores) ?? 0 };
  });
}

export function csmPerformance(customers: Customer[]) {
  const assigned = customers.filter((c) => c.csm_name);
  const map = new Map<
    string,
    { customers: Customer[]; mrr: number }
  >();
  for (const c of assigned) {
    const key = c.csm_name!;
    const entry = map.get(key) ?? { customers: [], mrr: 0 };
    entry.customers.push(c);
    entry.mrr += num(c.mrr);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([csm, v]) => {
      const churned = v.customers.filter((c) => c.status === "Churned").length;
      const nps = avg(
        v.customers
          .map((c) => c.nps_score)
          .filter((n): n is number => n !== null && n !== undefined),
      );
      return {
        csm,
        accounts: v.customers.length,
        mrr: v.mrr,
        churnRate: (churned / v.customers.length) * 100,
        avgNps: nps ?? 0,
      };
    })
    .sort((a, b) => b.mrr - a.mrr);
}

function quarterSortKey(q: string) {
  const match = /^Q(\d)-(\d{4})$/.exec(q);
  if (!match) return 0;
  return Number(match[2]) * 10 + Number(match[1]);
}

export function renewalPipeline(customers: Customer[]) {
  const upForRenewal = customers.filter(
    (c) => c.status !== "Churned" && c.renewal_quarter,
  );
  const map = new Map<string, { mrr: number; count: number }>();
  for (const c of upForRenewal) {
    const key = c.renewal_quarter!;
    const entry = map.get(key) ?? { mrr: 0, count: 0 };
    entry.mrr += num(c.mrr);
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([quarter, v]) => ({ quarter, ...v }))
    .sort((a, b) => quarterSortKey(a.quarter) - quarterSortKey(b.quarter));
}
