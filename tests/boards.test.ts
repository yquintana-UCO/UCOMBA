import { afterEach, describe, expect, it, vi } from "vitest";
import { filterJobs, findBoard, getJobDetails } from "@/lib/jobs/boards";
import { runCustomTool } from "@/lib/scout/tools";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const notFound = () => new Response("{}", { status: 404 });

function mockFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const hit = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
      return hit ? ok(hit[1]) : notFound();
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("findBoard", () => {
  it("finds a Greenhouse board", async () => {
    mockFetch({
      "https://boards-api.greenhouse.io/v1/boards/acmegh/jobs": {
        jobs: [{ id: 1, title: "Product Manager", absolute_url: "https://x/1", location: { name: "Chicago" } }],
      },
    });
    const board = await findBoard("AcmeGH");
    expect(board).toMatchObject({ ats: "greenhouse", board: "acmegh" });
    expect(board?.jobs[0]).toMatchObject({ job_id: "1", title: "Product Manager", location: "Chicago" });
  });

  it("reads Lever salary ranges and Ashby compensation", async () => {
    mockFetch({
      "https://api.lever.co/v0/postings/leverco": [
        {
          id: "abc",
          text: "Data Analyst",
          hostedUrl: "https://jobs.lever.co/leverco/abc",
          categories: { location: "Austin", team: "Analytics", commitment: "Full-time" },
          salaryRange: { min: 90000, max: 120000, currency: "USD", interval: "per-year-salary" },
          descriptionPlain: "Analyse data.",
        },
      ],
      "https://api.ashbyhq.com/posting-api/job-board/ashbyco": {
        jobs: [
          {
            id: "j1",
            title: "Engineer",
            jobUrl: "https://jobs.ashbyhq.com/ashbyco/j1",
            location: "Remote",
            compensation: { scrapeableCompensationSalarySummary: "$150K – $190K" },
          },
        ],
      },
    });
    const lever = await findBoard("LeverCo");
    expect(lever?.jobs[0].posted_salary).toBe("$90,000 – $120,000 USD per year salary");
    const ashby = await findBoard("AshbyCo");
    expect(ashby?.jobs[0].posted_salary).toBe("$150K – $190K");
  });

  it("returns null when no platform has the company", async () => {
    mockFetch({});
    expect(await findBoard("Nobody Here")).toBeNull();
  });
});

describe("getJobDetails", () => {
  it("reads Greenhouse pay transparency ranges", async () => {
    mockFetch({
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs/7": {
        id: 7,
        title: "Strategy Lead",
        absolute_url: "https://x/7",
        location: { name: "NYC" },
        departments: [{ name: "Strategy" }],
        content: "&lt;p&gt;Lead strategy. Salary $140,000 - $170,000.&lt;/p&gt;",
        pay_input_ranges: [{ min_cents: 14000000, max_cents: 17000000, currency_type: "USD", title: "NYC" }],
      },
    });
    const job = await getJobDetails("greenhouse", "acme", "7");
    expect(job?.posted_salary).toBe("$140,000 – $170,000 USD (NYC)");
    expect(job?.team).toBe("Strategy");
    expect(job?.salary_mentions[0]).toContain("$140,000 - $170,000");
  });
});

describe("filterJobs", () => {
  const jobs = [
    { job_id: "1", title: "Senior Product Manager", location: "Remote - US", url: "" },
    { job_id: "2", title: "Account Executive", location: "Chicago", team: "Sales", url: "" },
  ];
  it("matches any comma-separated phrase and the location", () => {
    expect(filterJobs(jobs, "product manager, designer").map((j) => j.job_id)).toEqual(["1"]);
    expect(filterJobs(jobs, "sales", "chicago").map((j) => j.job_id)).toEqual(["2"]);
    expect(filterJobs(jobs, undefined, "remote").map((j) => j.job_id)).toEqual(["1"]);
  });
});

describe("runCustomTool", () => {
  it("rejects invalid input as a tool error", async () => {
    const result = await runCustomTool("get_job_details", { ats: "workday", board: "x", job_id: "1" });
    expect(result.isError).toBe(true);
  });

  it("tells Claude how to recover when a board is not found", async () => {
    mockFetch({});
    const result = await runCustomTool("find_company_jobs", { company: "Unknown Co" });
    expect(JSON.parse(result.content)).toMatchObject({ found: false });
  });
});
