import { z } from "zod";
import { generateText } from "@/lib/ai/provider";
import { formatDateRange, todayInOkc } from "@/lib/dates";
import { getUpcomingEvents } from "@/lib/events";

const Body = z.object({
  question: z.string().trim().min(1).max(500),
});

const SYSTEM = `You are Fiesta OKC, a friendly local guide to fall, Hispanic Heritage Month, and
Thunder game-day activities in Oklahoma City and nearby towns. Answer ONLY from the event list provided.
If nothing matches, say so and suggest the closest options. Keep answers short, warm, and
practical: name, date/time, place, and price. If a detail (time, place, price) isn't
listed, say to check with the organizer rather than guessing. Reply in the language the user writes in
(English or Spanish).

Each event line starts with its id in square brackets. Respond with ONLY a JSON object, no code fences:
{"answer": "<your reply, plain text, under 120 words>", "event_ids": ["<ids of the events you recommend, best first, at most 6>"]}`;

/** Pull {answer, event_ids} out of the model's reply, tolerating code fences or stray text. */
function parseReply(raw: string, validIds: Set<string>) {
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    const obj = JSON.parse(match?.[0] ?? "");
    const answer = typeof obj.answer === "string" ? obj.answer : raw;
    const ids = Array.isArray(obj.event_ids) ? obj.event_ids : [];
    return {
      answer,
      eventIds: ids.filter(
        (id: unknown): id is string =>
          typeof id === "string" && validIds.has(id),
      ),
    };
  } catch {
    return { answer: raw, eventIds: [] as string[] };
  }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Please send { question: string }." },
      { status: 400 },
    );
  }

  const events = await getUpcomingEvents();
  const context = events
    .map((e) =>
      [
        `[${e.id}] ${e.title}`,
        e.category,
        formatDateRange(e) + (e.hours_text ? ` (${e.hours_text})` : ""),
        [e.venue, e.address, e.city].filter(Boolean).join(", "),
        e.price_text ?? (e.is_free ? "Free" : "price not listed"),
        e.description ?? "",
      ].join(" | "),
    )
    .map((line) => `- ${line}`)
    .join("\n");

  try {
    const raw = await generateText({
      system: SYSTEM,
      prompt: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Chicago" })}, ${todayInOkc()} (Oklahoma time).\n\nUpcoming events:\n${context || "(none)"}\n\nQuestion: ${parsed.data.question}`,
    });
    return Response.json(parseReply(raw, new Set(events.map((e) => e.id))));
  } catch (err) {
    console.error("AI request failed", err);
    return Response.json(
      {
        error:
          "The guide is unavailable right now. Check your AI provider key.",
      },
      { status: 502 },
    );
  }
}
