const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
  hellip: "…",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Turns job-description HTML into readable plain text with list bullets kept. */
export function htmlToText(html: string): string {
  // Greenhouse returns HTML that is itself entity-escaped (&lt;p&gt;), so decode first.
  const decoded = /&lt;\/?[a-z]/i.test(html) ? decodeEntities(html) : html;
  const text = decoded
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}… [truncated]`;
}

const MONEY = String.raw`(?:[$£€]|USD\s?|CAD\s?|EUR\s?|GBP\s?)\s?\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?\s?[kK]?`;
const SALARY_RANGE = new RegExp(String.raw`${MONEY}\s*(?:-|–|—|to)\s*${MONEY}`, "g");

/** Finds pay ranges written into a job description, with a little context around each. */
export function findSalaryMentions(text: string, limit = 3): string[] {
  const mentions: string[] = [];
  for (const match of text.matchAll(SALARY_RANGE)) {
    const start = Math.max(0, match.index - 80);
    const end = Math.min(text.length, match.index + match[0].length + 40);
    mentions.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    if (mentions.length >= limit) break;
  }
  return mentions;
}

/** Board slugs to try for a company name, e.g. "Notion Labs, Inc." → notionlabs, notion-labs, notion. */
export function slugCandidates(company: string): string[] {
  const words = company
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|plc|gmbh)\b\.?/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return [];
  return [...new Set([words.join(""), words.join("-"), words[0]])];
}
