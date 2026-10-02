import { findSalaryMentions, htmlToText, slugCandidates, truncate } from "./text";

/**
 * Adapters for the public job-board APIs of the applicant-tracking systems most
 * companies post through. These are plain HTTP calls - no AI involved.
 */

export const ATS_LIST = ["greenhouse", "lever", "ashby"] as const;
export type Ats = (typeof ATS_LIST)[number];

export interface Job {
  job_id: string;
  title: string;
  location: string;
  team?: string;
  employment_type?: string;
  url: string;
  /** Pay range the employer published in a structured field, if any. */
  posted_salary?: string;
  /** Plain-text description; only filled when the board's list endpoint includes it. */
  description?: string;
}

export interface Board {
  ats: Ats;
  board: string;
  jobs: Job[];
}

export interface JobDetails extends Job {
  ats: Ats;
  board: string;
  /** Pay ranges found written into the description text. */
  salary_mentions: string[];
  description: string;
}

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 10 * 60_000;
const DESCRIPTION_MAX_CHARS = 9_000;

// Lives as long as the warm serverless instance; saves re-fetching a board during a conversation.
const cache = new Map<string, { at: number; value: unknown }>();

async function getJson(url: string): Promise<unknown | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "JobScout/0.1" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const value: unknown = await res.json();
    cache.set(url, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

export function formatPay(
  min: number | undefined,
  max: number | undefined,
  currency = "USD",
  interval?: string,
): string | undefined {
  if (min == null && max == null) return undefined;
  let fmt: Intl.NumberFormat;
  try {
    fmt = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  }
  const range = min != null && max != null && min !== max ? `${fmt.format(min)} – ${fmt.format(max)}` : fmt.format((min ?? max)!);
  const per = interval ? ` ${interval.replace(/-/g, " ").toLowerCase()}` : "";
  return `${range} ${currency}${per}`;
}

// ---------- Greenhouse: boards-api.greenhouse.io ----------

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: { name: string }[];
  content?: string;
  pay_input_ranges?: { min_cents: number; max_cents: number; currency_type: string; title?: string }[];
}

const greenhouse = {
  async list(board: string): Promise<Job[] | null> {
    const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs`)) as
      | { jobs?: GreenhouseJob[] }
      | null;
    if (!data || !Array.isArray(data.jobs)) return null;
    return data.jobs.map((j) => ({
      job_id: String(j.id),
      title: j.title,
      location: j.location?.name ?? "Not listed",
      url: j.absolute_url,
    }));
  },
  async details(board: string, jobId: string): Promise<JobDetails | null> {
    const j = (await getJson(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}?pay_transparency=true`,
    )) as GreenhouseJob | null;
    if (!j || typeof j.title !== "string") return null;
    const description = htmlToText(j.content ?? "");
    const pay = (j.pay_input_ranges ?? [])
      .map((r) => {
        const range = formatPay(r.min_cents / 100, r.max_cents / 100, r.currency_type);
        return r.title ? `${range} (${r.title})` : range;
      })
      .filter(Boolean)
      .join("; ");
    return {
      ats: "greenhouse",
      board,
      job_id: String(j.id),
      title: j.title,
      location: j.location?.name ?? "Not listed",
      team: j.departments?.map((d) => d.name).join(", ") || undefined,
      url: j.absolute_url,
      posted_salary: pay || undefined,
      salary_mentions: findSalaryMentions(description),
      description: truncate(description, DESCRIPTION_MAX_CHARS),
    };
  },
};

// ---------- Lever: api.lever.co ----------

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: { location?: string; team?: string; department?: string; commitment?: string };
  workplaceType?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
}

function leverJob(p: LeverPosting): Job {
  const location = [p.categories?.location, p.workplaceType === "remote" ? "Remote" : undefined]
    .filter(Boolean)
    .join(" · ");
  const description = [
    p.descriptionPlain ?? "",
    ...(p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`),
    p.additionalPlain ?? "",
  ]
    .join("\n\n")
    .trim();
  return {
    job_id: p.id,
    title: p.text,
    location: location || "Not listed",
    team: [p.categories?.department, p.categories?.team].filter(Boolean).join(" / ") || undefined,
    employment_type: p.categories?.commitment,
    url: p.hostedUrl,
    posted_salary: formatPay(p.salaryRange?.min, p.salaryRange?.max, p.salaryRange?.currency, p.salaryRange?.interval),
    description,
  };
}

const lever = {
  async list(board: string): Promise<Job[] | null> {
    const data = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`);
    if (!Array.isArray(data)) return null;
    return (data as LeverPosting[]).map(leverJob);
  },
};

// ---------- Ashby: api.ashbyhq.com ----------

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  location?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  isRemote?: boolean;
  descriptionPlain?: string;
  compensation?: { scrapeableCompensationSalarySummary?: string; compensationTierSummary?: string };
}

const ashby = {
  async list(board: string): Promise<Job[] | null> {
    const data = (await getJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    )) as { jobs?: AshbyJob[] } | null;
    if (!data || !Array.isArray(data.jobs)) return null;
    return data.jobs.map((j) => ({
      job_id: j.id,
      title: j.title,
      location: [j.location, j.isRemote ? "Remote" : undefined].filter(Boolean).join(" · ") || "Not listed",
      team: [j.department, j.team].filter(Boolean).join(" / ") || undefined,
      employment_type: j.employmentType,
      url: j.jobUrl,
      posted_salary:
        j.compensation?.scrapeableCompensationSalarySummary || j.compensation?.compensationTierSummary || undefined,
      description: j.descriptionPlain,
    }));
  },
};

// ---------- Public API ----------

export function listJobs(ats: Ats, board: string): Promise<Job[] | null> {
  switch (ats) {
    case "greenhouse":
      return greenhouse.list(board);
    case "lever":
      return lever.list(board);
    case "ashby":
      return ashby.list(board);
  }
}

/**
 * Finds which job board a company uses by trying likely board names on each
 * platform. A board with open roles wins over an empty one.
 */
export async function findBoard(company: string, hint: { ats?: Ats; board?: string } = {}): Promise<Board | null> {
  const slugs = hint.board ? [hint.board.toLowerCase()] : slugCandidates(company);
  const platforms = hint.ats ? [hint.ats] : ATS_LIST;
  const attempts = slugs.flatMap((board) => platforms.map((ats) => ({ ats, board })));
  const results = await Promise.all(
    attempts.map(async ({ ats, board }) => ({ ats, board, jobs: await listJobs(ats, board) })),
  );
  const found = results.filter((r): r is Board => r.jobs !== null);
  return found.find((r) => r.jobs.length > 0) ?? found[0] ?? null;
}

export async function getJobDetails(ats: Ats, board: string, jobId: string): Promise<JobDetails | null> {
  if (ats === "greenhouse") return greenhouse.details(board, jobId);
  // Lever and Ashby list endpoints already carry full descriptions.
  const job = (await listJobs(ats, board))?.find((j) => j.job_id === jobId);
  if (!job) return null;
  const description = job.description ?? "";
  return {
    ...job,
    ats,
    board,
    salary_mentions: findSalaryMentions(description),
    description: truncate(description, DESCRIPTION_MAX_CHARS),
  };
}

/** Keeps jobs whose title/team match any comma-separated phrase, and whose location matches. */
export function filterJobs(jobs: Job[], keywords?: string, location?: string): Job[] {
  const phrases = (keywords ?? "")
    .toLowerCase()
    .split(",")
    .map((p) => p.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length > 0);
  const where = location?.trim().toLowerCase();
  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.team ?? ""}`.toLowerCase();
    const keywordOk = phrases.length === 0 || phrases.some((words) => words.every((w) => haystack.includes(w)));
    const locationOk = !where || job.location.toLowerCase().includes(where);
    return keywordOk && locationOk;
  });
}
