const test = require("node:test");
const assert = require("node:assert");
const { companyJobs } = require("../api/_lib/companyJobs");

test("company feeds add Oklahoma and remote jobs from Workday and Greenhouse; others are skipped", async () => {
  const calls = [];
  const deps = { env: {}, fetch: async (url, opts = {}) => {
    calls.push(url);
    const json = body => ({ ok: true, status: 200, json: async () => body });
    if (url.includes("/wday/cxs/devonenergy/Careers/jobs")) {
      const { offset } = JSON.parse(opts.body);
      return json({ jobPostings: offset ? [] : [
        { title: "Financial Analyst", externalPath: "/job/OKC/Financial-Analyst_R1", locationsText: "Oklahoma City, OK" },
        { title: "Landman", externalPath: "/job/Houston/Landman_R2", locationsText: "Houston, TX" }] });
    }
    if (url.startsWith("https://boards-api.greenhouse.io/v1/boards/paycom/jobs")) return json({ jobs: [
      { title: "Software Engineer", location: { name: "Remote" }, absolute_url: "https://boards.greenhouse.io/paycom/jobs/7", content: "$90,000 - $120,000 per year", departments: [] }] });
    return { ok: false, status: 404, json: async () => ({}) };
  } };
  const out = await companyJobs(deps, [
    { name: "Devon Energy", careersUrl: "https://www.devonenergy.com/careers", feed: "https://devonenergy.wd5.myworkdayjobs.com/Careers" },
    { name: "Paycom", careersUrl: "https://boards.greenhouse.io/paycom", ats: "greenhouse", atsSlug: "paycom" },
    { name: "OG&E", careersUrl: "https://jobs.oge.com/" }
  ]);
  assert.deepStrictEqual(out.jobs.map(j => `${j.company}: ${j.title}`), ["Devon Energy: Financial Analyst", "Paycom: Software Engineer"]);
  assert.strictEqual(out.jobs[0].oklahoma, true);
  assert.strictEqual(out.jobs[1].remote, true);
  assert.strictEqual(out.jobs[1].salary, "$90,000 - $120,000 per year");
  assert.strictEqual(out.jobs[0].source, "Devon Energy careers site");
  assert.match(out.companies.find(c => c.company === "OG&E").status, /no public feed/);
  assert.ok(!calls.some(u => /tavily|firecrawl|anthropic/.test(u)), "no paid services are called");
});
