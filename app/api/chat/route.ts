import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runScout, type ScoutEvent } from "@/lib/scout/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_TURNS = 40;
const MAX_CHARS_PER_TURN = 20_000;

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CHARS_PER_TURN),
      }),
    )
    .min(1)
    .max(MAX_TURNS)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "must start and end with a user turn"),
});

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return "Scout is busy right now. Please try again in a minute.";
  if (err instanceof Anthropic.AuthenticationError) return "The server's Anthropic API key is missing or invalid.";
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status ?? "network"}). Please try again.`;
  return "Something went wrong. Please try again.";
}

/** Streams newline-delimited JSON ScoutEvents to the browser. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ScoutEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of runScout(parsed.data.messages, req.signal)) send(event);
      } catch (err) {
        if (!req.signal.aborted) {
          console.error(err);
          send({ type: "error", message: errorMessage(err) });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
