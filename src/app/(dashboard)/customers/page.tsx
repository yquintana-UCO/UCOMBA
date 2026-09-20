import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import { CustomersTable } from "@/components/CustomersTable";
import { CsmTable } from "@/components/CsmTable";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("mrr", { ascending: false });

  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Customers
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Full account list with filters, and CSM book-of-business performance.
        </p>
      </div>

      {error && (
        <p className="text-sm text-[var(--status-critical)]">
          Could not load customers: {error.message}
        </p>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          CSM performance
        </h2>
        <CsmTable customers={customers} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          All accounts
        </h2>
        <CustomersTable customers={customers} />
      </div>
    </div>
  );
}
