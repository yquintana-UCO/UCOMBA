create extension if not exists pgcrypto;

create table if not exists customers (
  customer_id text primary key,
  company_name text not null,
  industry text,
  company_size text,
  employees integer,
  plan text,
  contract_type text,
  mrr numeric(12,2),
  start_date date,
  churn_date date,
  status text,
  csm_assigned boolean,
  csm_name text,
  product_usage_score integer,
  support_tickets_90d integer,
  last_login_days_ago integer,
  nps_score integer,
  churn_reason text,
  months_as_customer integer,
  renewal_quarter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_status_idx on customers (status);
create index if not exists customers_industry_idx on customers (industry);
create index if not exists customers_plan_idx on customers (plan);

alter table customers enable row level security;
