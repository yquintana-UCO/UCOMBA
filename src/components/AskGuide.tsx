"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "Free family events this weekend?",
  "¿Dónde puedo bailar salsa?",
  "Art exhibits for Hispanic Heritage Month",
];

export default function AskGuide() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? data.error ?? "Something went wrong.");
    } catch {
      setAnswer("Couldn't reach the guide. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-amber-50 to-rose-50 p-6 dark:border-stone-700 dark:from-stone-900 dark:to-stone-900">
      <h2 className="text-xl font-bold">Ask the guide ✨</h2>
      <p className="text-sm text-stone-600 dark:text-stone-300">
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
          className="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-800"
          maxLength={500}
        />
        <button
          disabled={loading}
          className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white disabled:opacity-60"
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
            className="rounded-full bg-white/70 px-3 py-1 text-xs hover:bg-white dark:bg-stone-800"
          >
            {s}
          </button>
        ))}
      </div>
      {answer && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-white/80 p-4 text-sm dark:bg-stone-800">
          {answer}
        </p>
      )}
    </section>
  );
}
