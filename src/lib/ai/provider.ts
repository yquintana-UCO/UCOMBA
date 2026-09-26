import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/**
 * One function, three interchangeable providers. Pick with AI_PROVIDER:
 *   anthropic  -> ANTHROPIC_API_KEY
 *   openai     -> OPENAI_API_KEY
 *   openrouter -> OPENROUTER_API_KEY (OpenAI-compatible API, any model)
 * Override the model with AI_MODEL.
 */
export type AiProvider = "anthropic" | "openai" | "openrouter";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5-mini",
  openrouter: "anthropic/claude-sonnet-5",
};

/** Read a key, dropping whitespace/newlines and wrapping quotes that sneak in when pasting. */
function readKey(name: string): string | undefined {
  const v = process.env[name]
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  return v || undefined;
}

const KEY_VARS: Record<AiProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Safe fingerprint of the active provider's key for logs: prefix + length, never the key. */
export function keyFingerprint(): string {
  try {
    const name = KEY_VARS[getProvider()];
    const v = readKey(name);
    return v
      ? `${name}=${v.slice(0, 7)}… (${v.length} chars)`
      : `${name} is empty`;
  } catch (err) {
    return String(err);
  }
}

export function getProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (p === "anthropic" || p === "openai" || p === "openrouter") return p;
  throw new Error(`Unknown AI_PROVIDER "${p}"`);
}

export async function generateText({
  system,
  prompt,
  maxTokens = 1024,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const provider = getProvider();
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: readKey("ANTHROPIC_API_KEY") });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return res.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
  }

  const client =
    provider === "openrouter"
      ? new OpenAI({
          apiKey: readKey("OPENROUTER_API_KEY"),
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
            "X-Title": "Fiesta OKC",
          },
        })
      : new OpenAI({ apiKey: readKey("OPENAI_API_KEY") });

  const res = await client.chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}
