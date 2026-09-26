import { z } from "zod";
import { generateText } from "@/lib/ai/provider";
import { getUpcomingEvents } from "@/lib/events";

const Body = z.object({
  question: z.string().trim().min(1).max(500),
});

const SYSTEM = `You are Fiesta OKC, a friendly local guide to fall and Hispanic Heritage Month
activities in Oklahoma City and nearby towns. Answer ONLY from the event list provided.
If nothing matches, say so and suggest the closest options. Keep answers short, warm, and
practical: name, date/time, place, and price. Reply in the language the user writes in
(English or Spanish).`;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please send { question: string }." }, { status: 400 });
  }

  const events = await getUpcomingEvents(60);
  const context = events
    .map(
      (e) =>
        `- ${e.title} | ${e.category} | ${new Date(e.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" })} | ${e.venue ?? ""}, ${e.city} | ${e.price_text ?? (e.is_free ? "Free" : "")} | ${e.description ?? ""}`,
    )
    .join("\n");

  try {
    const answer = await generateText({
      system: SYSTEM,
      prompt: `Today is ${new Date().toDateString()}.\n\nUpcoming events:\n${context || "(none)"}\n\nQuestion: ${parsed.data.question}`,
    });
    return Response.json({ answer });
  } catch (err) {
    console.error("AI request failed", err);
    return Response.json(
      { error: "The guide is unavailable right now. Check your AI provider key." },
      { status: 502 },
    );
  }
}
