"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "Free family events this weekend?",
  "¿Qué hay para el Día de los Muertos?",
  "When is the Thunder home opener?",
  "Plan me a Norman day trip",
];

export default function AskGuide({
  onPicks,
}: {
  onPicks: (ids: string[]) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setAnswer(null);
    onPicks([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? data.error ?? "Something went wrong.");
      onPicks(Array.isArray(data.eventIds) ? data.eventIds : []);
    } catch {
      setAnswer("Couldn't reach the guide. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-md ring-1 ring-thunder-blue/10">
      <h2 className="text-xl font-bold">Ask the guide ✨</h2>
      <p className="text-sm text-muted">
        Tell us what you’re in the mood for — English or Español.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Something fun and free on Saturday night"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-thunder-blue"
          maxLength={500}
        />
        <button
          disabled={loading}
          className="rounded-lg bg-thunder-orange px-5 py-2 font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="rounded-full border border-line px-3 py-1 text-xs hover:border-thunder-blue hover:text-thunder-blue"
          >
            {s}
          </button>
        ))}
      </div>
      {answer && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border-l-4 border-thunder-blue bg-thunder-blue/5 p-4 text-sm">
          {answer}
        </p>
      )}
    </section>
  );
}
