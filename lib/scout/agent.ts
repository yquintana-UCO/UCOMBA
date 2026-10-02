import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";
import { customTools, describeToolCall, runCustomTool } from "./tools";

export const MODEL = "claude-opus-5-5";
const MAX_ROUNDS = 12;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ScoutEvent =
  | { type: "text"; text: string }
  | { type: "status"; message: string }
  | { type: "error"; message: string };

const client = new Anthropic();

const tools: Anthropic.Beta.BetaToolUnion[] = [
  ...customTools,
  { type: "web_search_20260209", name: "web_search", max_uses: 6 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
];

/**
 * After a server-side fallback switches models mid-answer, blocks the first model
 * produced before the switch (other than text and completed web results) must not be sent back.
 */
export function echoableContent(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlockParam[] {
  const lastFallback = content.findLastIndex((b) => b.type === "fallback");
  if (lastFallback < 0) return content;
  const before = content.slice(0, lastFallback);
  const completedServerCalls = new Set(
    before.flatMap((b) =>
      b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result" ? [b.tool_use_id] : [],
    ),
  );
  const kept = before.filter(
    (b) =>
      b.type === "text" ||
      b.type === "web_search_tool_result" ||
      b.type === "web_fetch_tool_result" ||
      (b.type === "server_tool_use" && completedServerCalls.has(b.id)),
  );
  return [...kept, ...content.slice(lastFallback)];
}

/**
 * Runs one chat turn: streams Scout's answer, running job-board tools as Claude asks for them.
 * Prior turns arrive as plain text, so each request only ever appends to this turn's history.
 */
export async function* runScout(history: ChatTurn[], signal?: AbortSignal): AsyncGenerator<ScoutEvent> {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
  let wroteText = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM_PROMPT,
        tools,
        messages,
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "text" && wroteText) {
        yield { type: "text", text: "\n\n" };
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        wroteText = true;
        yield { type: "text", text: event.delta.text };
      } else if (event.type === "content_block_stop") {
        const block = stream.currentMessage?.content[event.index];
        if (block?.type === "server_tool_use") yield { type: "status", message: describeToolCall(block.name, block.input) };
      }
    }

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      yield { type: "text", text: "\n\nSorry, I can't help with that request. Try asking about a company or role." };
      return;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: echoableContent(message.content) });
      continue;
    }

    const content = echoableContent(message.content);
    const toolCalls = content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (message.stop_reason !== "tool_use" || toolCalls.length === 0) {
      if (message.stop_reason === "max_tokens") yield { type: "text", text: "\n\n_(Answer cut short. Ask me to continue.)_" };
      return;
    }

    for (const call of toolCalls) yield { type: "status", message: describeToolCall(call.name, call.input) };
    const results = await Promise.all(
      toolCalls.map(async (call): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const { content: result, isError } = await runCustomTool(call.name, call.input);
        return { type: "tool_result", tool_use_id: call.id, content: result, is_error: isError };
      }),
    );
    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: results });
  }

  yield { type: "error", message: "That took more steps than expected. Try narrowing the question to fewer companies." };
}
