"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-plane)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Helix Customer Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {mode === "sign-in"
            ? "Sign in with your Helix account."
            : "Create the first account to access the dashboard."}
        </p>

        {status === "sent" ? (
          <p className="mt-6 rounded-md bg-[var(--status-good-bg)] p-3 text-sm text-[var(--text-primary)]">
            Check {email} for a confirmation link, then sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)]"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--status-critical)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md bg-[var(--series-1)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === "loading"
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
            setStatus("idle");
          }}
          className="mt-4 text-sm text-[var(--series-1)] hover:underline"
        >
          {mode === "sign-in"
            ? "First time here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
