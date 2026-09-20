"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; imported: number }
  | { kind: "error"; message: string };

const EXPECTED_COLUMNS = [
  "customer_id",
  "company_name",
  "industry",
  "company_size",
  "employees",
  "plan",
  "contract_type",
  "mrr",
  "start_date",
  "churn_date",
  "status",
  "csm_assigned",
  "csm_name",
  "product_usage_score",
  "support_tickets_90d",
  "last_login_days_ago",
  "nps_score",
  "churn_reason",
  "months_as_customer",
  "renewal_quarter",
];

export default function ImportPage() {
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setResult({ kind: "loading" });
    const csv = await file.text();

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = await res.json();

    if (!res.ok) {
      setResult({ kind: "error", message: body.error ?? "Import failed" });
      return;
    }

    setResult({ kind: "success", imported: body.imported });
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Import data
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Upload your customer export as a CSV. Existing rows are matched by{" "}
          <code className="rounded bg-[var(--page-plane)] px-1 py-0.5 text-xs">
            customer_id
          </code>{" "}
          and updated; new IDs are added.
        </p>
      </div>

      <div
        className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-10 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Drag and drop a .csv file here, or
        </p>
        <button
          onClick={() => fileInput.current?.click()}
          className="mt-3 rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white"
        >
          Choose file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {result.kind === "loading" && (
        <p className="text-sm text-[var(--text-secondary)]">Importing…</p>
      )}
      {result.kind === "success" && (
        <p className="rounded-md bg-[var(--status-good-bg)] p-3 text-sm text-[var(--text-primary)]">
          Imported {result.imported} rows. The overview and customer list are
          now up to date.
        </p>
      )}
      {result.kind === "error" && (
        <p className="rounded-md bg-[var(--status-critical-bg)] p-3 text-sm text-[var(--status-critical)]">
          {result.message}
        </p>
      )}

      <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
          Expected columns
        </summary>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Only <code>customer_id</code> and <code>company_name</code> are
          required; everything else is optional.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXPECTED_COLUMNS.map((col) => (
            <code
              key={col}
              className="rounded bg-[var(--page-plane)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {col}
            </code>
          ))}
        </div>
      </details>
    </div>
  );
}
