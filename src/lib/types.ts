export type CustomerStatus = "Active" | "At-Risk" | "Churned";

export interface Customer {
  customer_id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  employees: number | null;
  plan: string | null;
  contract_type: string | null;
  mrr: number | null;
  start_date: string | null;
  churn_date: string | null;
  status: CustomerStatus;
  csm_assigned: boolean | null;
  csm_name: string | null;
  product_usage_score: number | null;
  support_tickets_90d: number | null;
  last_login_days_ago: number | null;
  nps_score: number | null;
  churn_reason: string | null;
  months_as_customer: number | null;
  renewal_quarter: string | null;
}
