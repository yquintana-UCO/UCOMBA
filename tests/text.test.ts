import { describe, expect, it } from "vitest";
import { findSalaryMentions, htmlToText, slugCandidates } from "@/lib/jobs/text";

describe("htmlToText", () => {
  it("decodes Greenhouse's escaped HTML and keeps bullets", () => {
    const html = "&lt;p&gt;About &amp;amp; you&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;";
    expect(htmlToText(html)).toBe("About & you\n\n- SQL\n- Python");
  });
});

describe("findSalaryMentions", () => {
  it("finds dollar ranges in several formats", () => {
    expect(findSalaryMentions("The base salary range is $120,000 - $150,000 per year.")[0]).toContain("$120,000 - $150,000");
    expect(findSalaryMentions("Pay: $95k–$110k plus equity")[0]).toContain("$95k–$110k");
    expect(findSalaryMentions("No numbers here")).toEqual([]);
  });
});

describe("slugCandidates", () => {
  it("drops legal suffixes and offers joined, hyphenated and first-word forms", () => {
    expect(slugCandidates("Notion Labs, Inc.")).toEqual(["notionlabs", "notion-labs", "notion"]);
    expect(slugCandidates("Stripe")).toEqual(["stripe"]);
  });
});
