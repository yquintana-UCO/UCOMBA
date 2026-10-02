import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ATS_LIST, filterJobs, findBoard, getJobDetails } from "../jobs/boards";

const MAX_JOBS_RETURNED = 25;

const FindCompanyJobsInput = z.object({
  company: z.string().min(1),
  keywords: z.string().optional(),
  location: z.string().optional(),
  ats: z.enum(ATS_LIST).optional(),
  board: z.string().optional(),
});

const GetJobDetailsInput = z.object({
  ats: z.enum(ATS_LIST),
  board: z.string().min(1),
  job_id: z.string().min(1),
});

export const customTools: Anthropic.Beta.BetaTool[] = [
  {
    name: "find_company_jobs",
    description:
      "List open jobs at one company by reading its public job board (Greenhouse, Lever or Ashby). " +
      "Call once per company. Pass keywords and/or location to narrow the list. If the company is not found, " +
      "use web_search to find its careers page and board name, then call again with ats and board set.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company name, e.g. 'Stripe'." },
        keywords: {
          type: "string",
          description: "Comma-separated role phrases to match in titles/teams, e.g. 'product manager, strategy'.",
        },
        location: { type: "string", description: "City, country or 'Remote' to filter by." },
        ats: { type: "string", enum: [...ATS_LIST], description: "Job board platform, only if known." },
        board: {
          type: "string",
          description: "Board name from the careers URL, e.g. 'acme' in boards.greenhouse.io/acme. Only if known.",
        },
      },
      required: ["company"],
      additionalProperties: false,
    },
  },
  {
    name: "get_job_details",
    description:
      "Get the full posting for one job: description, requirements, and any salary range the employer published. " +
      "Use the ats, board and job_id values returned by find_company_jobs.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        ats: { type: "string", enum: [...ATS_LIST] },
        board: { type: "string" },
        job_id: { type: "string" },
      },
      required: ["ats", "board", "job_id"],
      additionalProperties: false,
    },
  },
];

/** Short, human-friendly line shown in the chat while a tool runs. */
export function describeToolCall(name: string, input: unknown): string {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "find_company_jobs":
      return `Checking ${String(args.company ?? "the company")}'s job board…`;
    case "get_job_details":
      return "Reading the full job posting…";
    case "web_search":
      return args.query ? `Searching the web: “${String(args.query)}”` : "Searching the web…";
    case "web_fetch":
      return "Reading a web page…";
    default:
      return "Working…";
  }
}

export async function runCustomTool(
  name: string,
  input: unknown,
): Promise<{ content: string; isError: boolean }> {
  try {
    if (name === "find_company_jobs") {
      const parsed = FindCompanyJobsInput.safeParse(input);
      if (!parsed.success) return { content: `Invalid input: ${parsed.error.message}`, isError: true };
      const { company, keywords, location, ats, board } = parsed.data;
      const found = await findBoard(company, { ats, board });
      if (!found) {
        return {
          content: JSON.stringify({
            found: false,
            company,
            note:
              "No Greenhouse, Lever or Ashby board found under the guessed names. Use web_search to find the " +
              "company's careers page. If it links to one of those platforms, call find_company_jobs again with " +
              "ats and board. Otherwise read the careers page with web_fetch.",
          }),
          isError: false,
        };
      }
      const matching = filterJobs(found.jobs, keywords, location);
      return {
        content: JSON.stringify({
          found: true,
          company,
          ats: found.ats,
          board: found.board,
          total_open_jobs: found.jobs.length,
          matching_jobs: matching.length,
          showing: Math.min(matching.length, MAX_JOBS_RETURNED),
          jobs: matching.slice(0, MAX_JOBS_RETURNED).map(({ description: _description, ...job }) => job),
        }),
        isError: false,
      };
    }

    if (name === "get_job_details") {
      const parsed = GetJobDetailsInput.safeParse(input);
      if (!parsed.success) return { content: `Invalid input: ${parsed.error.message}`, isError: true };
      const { ats, board, job_id } = parsed.data;
      const details = await getJobDetails(ats, board, job_id);
      if (!details) return { content: "Job not found - it may have just closed.", isError: true };
      return { content: JSON.stringify(details), isError: false };
    }

    return { content: `Unknown tool: ${name}`, isError: true };
  } catch (err) {
    return { content: `Tool failed: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}
