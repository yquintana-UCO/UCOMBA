import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

const REQUIRED_COLUMNS = ["customer_id", "company_name"];

function toNullableNumber(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toNullableDate(v: string | undefined): string | null {
  if (v === undefined || v.trim() === "") return null;
  return v.trim();
}

function toNullableString(v: string | undefined): string | null {
  if (v === undefined || v.trim() === "") return null;
  return v.trim();
}

function toBool(v: string | undefined): boolean | null {
  if (v === undefined || v.trim() === "") return null;
  return v.trim().toLowerCase() === "yes" || v.trim().toLowerCase() === "true";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const csv = body?.csv;
  if (typeof csv !== "string" || csv.trim().length === 0) {
    return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
  }

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: `CSV parse error: ${parsed.errors[0].message}` },
      { status: 400 },
    );
  }

  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const rows = parsed.data
    .filter((row) => row.customer_id && row.customer_id.trim() !== "")
    .map((row) => ({
      customer_id: row.customer_id.trim(),
      company_name: row.company_name?.trim() ?? "",
      industry: toNullableString(row.industry),
      company_size: toNullableString(row.company_size),
      employees: toNullableNumber(row.employees),
      plan: toNullableString(row.plan),
      contract_type: toNullableString(row.contract_type),
      mrr: toNullableNumber(row.mrr),
      start_date: toNullableDate(row.start_date),
      churn_date: toNullableDate(row.churn_date),
      status: toNullableString(row.status) ?? "Active",
      csm_assigned: toBool(row.csm_assigned),
      csm_name: toNullableString(row.csm_name),
      product_usage_score: toNullableNumber(row.product_usage_score),
      support_tickets_90d: toNullableNumber(row.support_tickets_90d),
      last_login_days_ago: toNullableNumber(row.last_login_days_ago),
      nps_score: toNullableNumber(row.nps_score),
      churn_reason: toNullableString(row.churn_reason),
      months_as_customer: toNullableNumber(row.months_as_customer),
      renewal_quarter: toNullableString(row.renewal_quarter),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customers")
    .upsert(rows, { onConflict: "customer_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: rows.length });
}
