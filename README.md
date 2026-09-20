# Helix Customer Dashboard

A web dashboard for analyzing Helix's customer base: revenue at risk, churn
drivers, product usage, CSM performance, and renewal pipeline. Built as a
Next.js app backed by Supabase (Postgres + Auth), deployed on Vercel.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** — Postgres table (`customers`) with row-level security, and
  Supabase Auth for sign-in (email/password)
- **Recharts** for the charts on the Overview page
- **Vercel** for hosting

## Data model

One table, `customers`, matches the columns in a typical CSV export from a
customer-success/billing system: `customer_id`, `company_name`, `industry`,
`company_size`, `employees`, `plan`, `contract_type`, `mrr`, `start_date`,
`churn_date`, `status`, `csm_assigned`, `csm_name`, `product_usage_score`,
`support_tickets_90d`, `last_login_days_ago`, `nps_score`, `churn_reason`,
`months_as_customer`, `renewal_quarter`.

`data/sample_customers.csv` is the seed dataset used to build and test this
dashboard — a reference for the column format the **Import data** page
expects.

## Local development

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's
   URL and anon/publishable key (Project Settings → API).
2. `npm install`
3. `npm run dev` and open http://localhost:3000

The database schema and row-level security policies are already applied to
the connected Supabase project (see `supabase/migrations` if you need to
reapply them elsewhere). Authenticated users can read and write the
`customers` table; anonymous access is blocked entirely.

### First-time login

There's no pre-seeded user account. Open the app, click **"First time here?
Create an account"** on the login page, and sign up with your work email.
Supabase sends a confirmation email — click the link, then sign in. Every
account created this way has full access to the dashboard; there's no
per-user role distinction in this first version.

## Importing data

Go to **Import data** and drop in a CSV export. Rows are matched by
`customer_id`: existing IDs are updated, new ones are added. Only
`customer_id` and `company_name` are required columns — everything else is
optional and stored as-is.

## Deployment

The app is deployed on Vercel. Environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are configured
in the Vercel project settings, mirroring `.env.local`.
