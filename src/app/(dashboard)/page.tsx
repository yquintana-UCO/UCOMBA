import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import {
  churnReasonBreakdown,
  computeKpis,
  mrrByIndustry,
  mrrByStatus,
  renewalPipeline,
  usageScoreByStatus,
} from "@/lib/metrics";
import { KpiTile } from "@/components/KpiTile";
import { ChartCard } from "@/components/ChartCard";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { UsageByStatusBar } from "@/components/charts/UsageByStatusBar";
import { VerticalBar } from "@/components/charts/VerticalBar";

const currency = (v: number) =>
  `$${Math.round(v).toLocaleString()}`;

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("mrr", { ascending: false });

  const customers = (data ?? []) as Customer[];

  if (error) {
    return (
      <p className="text-sm text-[var(--status-critical)]">
        Could not load customers: {error.message}
      </p>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No customer data yet.{" "}
          <a href="/import" className="text-[var(--series-1)] hover:underline">
            Import a CSV export
          </a>{" "}
          to populate the dashboard.
        </p>
      </div>
    );
  }

  const kpis = computeKpis(customers);
  const statusData = mrrByStatus(customers);
  const industryData = mrrByIndustry(customers).slice(0, 8);
  const churnReasons = churnReasonBreakdown(customers);
  const usageByStatus = usageScoreByStatus(customers);
  const renewals = renewalPipeline(customers);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {kpis.totalCustomers} customers · updated from your latest export
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile label="Current MRR" value={currency(kpis.currentMrr)} />
        <KpiTile
          label="At-risk MRR"
          value={currency(kpis.atRiskMrr)}
          tone="warning"
        />
        <KpiTile
          label="Churn rate"
          value={`${kpis.churnRate.toFixed(1)}%`}
          tone={kpis.churnRate > 25 ? "critical" : undefined}
        />
        <KpiTile
          label="Avg. NPS"
          value={kpis.avgNps !== null ? kpis.avgNps.toFixed(0) : "—"}
          tone={
            kpis.avgNps !== null && kpis.avgNps < 0 ? "critical" : "good"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Customers by status"
          subtitle={`${kpis.activeCount} active · ${kpis.atRiskCount} at-risk · ${kpis.churnedCount} churned`}
        >
          <StatusDonut data={statusData} />
        </ChartCard>

        <ChartCard title="MRR by industry" subtitle="Top 8 industries">
          <HorizontalBar
            data={industryData}
            categoryKey="industry"
            valueKey="mrr"
            valueFormat="currency"
          />
        </ChartCard>

        <ChartCard
          title="Product usage vs. status"
          subtitle="Avg. usage score (0–100)"
        >
          <UsageByStatusBar data={usageByStatus} />
        </ChartCard>

        <ChartCard title="Why customers churn" subtitle="Reported churn reasons">
          <HorizontalBar
            data={churnReasons}
            categoryKey="reason"
            valueKey="count"
            height={240}
          />
        </ChartCard>

        <ChartCard
          title="Renewal pipeline"
          subtitle="MRR up for renewal, active + at-risk accounts"
        >
          <VerticalBar
            data={renewals}
            categoryKey="quarter"
            valueKey="mrr"
            valueFormat="currency"
          />
        </ChartCard>
      </div>
    </div>
  );
}
