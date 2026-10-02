"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };
type ScoutEvent = { type: "text"; text: string } | { type: "status"; message: string } | { type: "error"; message: string };

const SUGGESTIONS = [
  "What product manager roles are open at Stripe and Ramp?",
  "Find remote data analyst jobs at Notion",
  "What does a Solutions Engineer at Datadog get paid?",
];

const EMAIL_KEY = "job-scout:email";

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        table: ({ node: _node, ...props }) => (
          <div className="table-wrap">
            <table {...props} />
          </div>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function EmailButton({ markdown, subject }: { markdown: string; subject: string }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; note?: string }>({ kind: "idle" });

  useEffect(() => {
    try {
      setTo(localStorage.getItem(EMAIL_KEY) ?? "");
    } catch {}
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      localStorage.setItem(EMAIL_KEY, to);
    } catch {}
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, subject, markdown }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (res?.ok) setState({ kind: "sent", note: `Sent to ${to}` });
    else setState({ kind: "error", note: data?.error ?? "Email failed to send." });
  }

  if (!open) {
    return (
      <button className="ghost" onClick={() => setOpen(true)}>
        ✉️ Email this
      </button>
    );
  }
  return (
    <form className="email-form" onSubmit={send}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label="Email address"
      />
      <button type="submit" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Sending…" : "Send"}
      </button>
      {state.note && <span className={state.kind === "error" ? "note error" : "note"}>{state.note}</span>}
    </form>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function appendToAnswer(text: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, content: last.content + text }];
    });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Message[] = [...messages, { role: "user", content: q }];
    // Drop empty assistant turns (e.g. a stopped request) so the history stays valid.
    const payload = history.filter((m) => m.content.trim());
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("Thinking…");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: payload }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ScoutEvent;
          if (event.type === "text") {
            setStatus(null);
            appendToAnswer(event.text);
          } else if (event.type === "status") {
            setStatus(event.message);
          } else {
            appendToAnswer(`\n\n> ⚠️ ${event.message}`);
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        appendToAnswer(`\n\n> ⚠️ ${err instanceof Error ? err.message : "Something went wrong."}`);
      }
    } finally {
      setBusy(false);
      setStatus(null);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="logo">🧭</div>
        <div>
          <h1>Job Scout</h1>
          <p>Open roles, what they really involve, and what they pay, at the companies you choose.</p>
        </div>
      </header>

      <main className="thread">
        {messages.length === 0 && (
          <section className="welcome">
            <h2>Where do you want to work?</h2>
            <p>
              Name one or more companies, and add a role or location if you have one in mind. I&apos;ll check their
              job boards and explain each role, including the pay.
            </p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => void ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          if (m.role === "user") {
            return (
              <div key={i} className="msg user">
                {m.content}
              </div>
            );
          }
          const streaming = busy && isLast;
          return (
            <div key={i} className="msg assistant">
              {m.content && <Markdown text={m.content} />}
              {streaming && status && (
                <div className="status">
                  <span className="dot" /> {status}
                </div>
              )}
              {!streaming && m.content && (
                <div className="actions">
                  <EmailButton markdown={m.content} subject={`Job Scout: ${messages[i - 1]?.content.slice(0, 80)}`} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <textarea
          rows={1}
          value={input}
          placeholder="Ask about a company or role…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message Job Scout"
        />
        {busy ? (
          <button type="button" className="stop" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
