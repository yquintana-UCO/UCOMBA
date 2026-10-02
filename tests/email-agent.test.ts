import { describe, expect, it } from "vitest";
import { isRecipientAllowed, renderEmailHtml } from "@/lib/email";
import { echoableContent } from "@/lib/scout/agent";

describe("isRecipientAllowed", () => {
  it("allows listed addresses and domains only", () => {
    const list = "boss@acme.com, @uco.edu";
    expect(isRecipientAllowed("Boss@Acme.com", list)).toBe(true);
    expect(isRecipientAllowed("student@uco.edu", list)).toBe(true);
    expect(isRecipientAllowed("someone@evil.com", list)).toBe(false);
    expect(isRecipientAllowed("someone@uco.edu", "")).toBe(false);
  });
});

describe("renderEmailHtml", () => {
  it("renders markdown tables and escapes raw HTML", async () => {
    const html = await renderEmailHtml("| Role | Pay |\n|---|---|\n| PM | $1 |\n\n<script>alert(1)</script>");
    expect(html).toContain("<table>");
    expect(html).not.toContain("<script>");
  });
});

describe("echoableContent", () => {
  it("drops pre-fallback thinking and tool calls but keeps text", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "text", text: "Partial", citations: null },
      { type: "tool_use", id: "t1", name: "find_company_jobs", input: {} },
      { type: "fallback", from: { model: "a" }, to: { model: "b" } },
      { type: "tool_use", id: "t2", name: "find_company_jobs", input: {} },
    ] as never;
    const types = echoableContent(content).map((b) => (b as { type: string }).type);
    expect(types).toEqual(["text", "fallback", "tool_use"]);
  });
});
