const test = require("node:test");
const assert = require("node:assert");
const { updateEmployerList, findOpenRoles, detectAts, pickBoard, matchesRole, payFromText } = require("../api/_lib/scout");
const { runAgent, cleanEmployers } = require("../api/agent");

const env = { TAVILY_API_KEY: "tvly-test", FIRECRAWL_API_KEY: "fc-test" };
const json = data => ({ ok: true, json: async () => data });

// Simulates Tavily, Firecrawl and the public ATS feeds.
function fakeWeb(calls = []) {
  return async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, body, headers: opts.headers });
    if (url === "https://api.tavily.com/search") {
      if (/Paycom careers/.test(body.query)) return json({ results: [
        { url: "https://www.indeed.com/cmp/Paycom/jobs", title: "Paycom jobs | Indeed" },
        { url: "https://boards.greenhouse.io/paycom", title: "Jobs at Paycom" }] });
      if (/Devon Energy careers/.test(body.query)) return json({ results: [
        { url: "https://www.devonenergy.com/careers", title: "Careers | Devon Energy" }] });
      if (/Nowhere Inc careers/.test(body.query)) return json({ results: [
        { url: "https://www.linkedin.com/company/nowhere", title: "LinkedIn" }] });
      if (body.include_domains?.[0] === "devonenergy.com") return json({ results: [
        { url: "https://www.devonenergy.com/careers", title: "Careers" },
        { url: "https://www.devonenergy.com/careers/job/hr-business-partner-123", title: "HR Business Partner" },
        { url: "https://www.devonenergy.com/careers/search?q=hr", title: "Search results" }] });
      return json({ results: [] });
    }
    if (url === "https://api.firecrawl.dev/v2/scrape") return json({ success: true, data: { markdown: `# Page for ${body.url}\nSalary $85,000 - $105,000 per year. Oklahoma City, OK` } });
    if (url.startsWith("https://boards-api.greenhouse.io/v1/boards/paycom/jobs")) return json({ jobs: [
      { title: "Talent Acquisition Partner", location: { name: "Oklahoma City, OK" }, absolute_url: "https://boards.greenhouse.io/paycom/jobs/1", content: "Pay: $60,000 - $75,000 per year", departments: [{ name: "Human Resources" }] },
      { title: "HR Generalist", location: { name: "Remote" }, absolute_url: "https://boards.greenhouse.io/paycom/jobs/2", content: "", departments: [] },
      { title: "Software Engineer", location: { name: "Oklahoma City, OK" }, absolute_url: "https://boards.greenhouse.io/paycom/jobs/3", content: "", departments: [{ name: "Engineering" }] }] });
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

// Claude stand-in for the posting extractor: keeps the real posting, rejects the search page.
const fakeAnthropic = {
  messages: { parse: async ({ messages }) => {
    const urls = [...messages[0].content.matchAll(/url="([^"]+)"/g)].map(m => m[1]);
    return { stop_reason: "end_turn", parsed_output: { postings: urls.map(url => ({
      url, is_job_posting: !/search/.test(url), title: "HR Business Partner", location: "Oklahoma City, OK", pay: "$85,000 - $105,000 per year" })) } };
  } }
};

test("detectAts and pickBoard prefer the employer's own hosted board over aggregators", () => {
  assert.deepStrictEqual(detectAts("https://boards.greenhouse.io/paycom/jobs/1"), { ats: "greenhouse", atsSlug: "paycom" });
  assert.deepStrictEqual(detectAts("https://jobs.lever.co/acme"), { ats: "lever", atsSlug: "acme" });
  assert.deepStrictEqual(detectAts("https://boards.greenhouse.io/embed/job_board?for=paycom"), { ats: "greenhouse", atsSlug: "paycom" });
  assert.strictEqual(detectAts("https://acme.wd5.myworkdayjobs.com/en-US/External").ats, "workday");
  assert.strictEqual(pickBoard([{ url: "https://www.indeed.com/cmp/x" }, { url: "https://x.com/careers" }]), "https://x.com/careers");
  assert.strictEqual(pickBoard([{ url: "https://www.linkedin.com/company/x" }]), null);
});

test("matchesRole and payFromText", () => {
  assert.ok(matchesRole("Senior HR Business Partner", "hr partner"));
  assert.ok(matchesRole("Talent Acquisition Partner", "hr", ["talent acquisition"]));
  assert.ok(!matchesRole("Software Engineer", "hr", ["recruiter"]));
  assert.strictEqual(payFromText("Range: $60,000 - $75,000 per year plus bonus"), "$60,000 - $75,000 per year");
  assert.strictEqual(payFromText("Competitive pay"), "");
});

test("update_employer_list finds each company's job board from the name", async () => {
  const calls = [];
  const deps = { fetch: fakeWeb(calls), env };
  const r = await updateEmployerList(deps, [], { add: ["Paycom", "Devon Energy", "Nowhere Inc", "paycom"], remove: [] });
  const byName = Object.fromEntries(r.employers.map(e => [e.name, e]));
  assert.deepStrictEqual(Object.keys(byName), ["Paycom", "Devon Energy", "Nowhere Inc"]); // de-duplicated
  assert.strictEqual(byName.Paycom.ats, "greenhouse");
  assert.strictEqual(byName.Paycom.careersUrl, "https://boards.greenhouse.io/paycom");
  assert.strictEqual(byName["Devon Energy"].domain, "www.devonenergy.com");
  assert.strictEqual(byName["Nowhere Inc"].careersUrl, null);
  assert.strictEqual(calls[0].headers.Authorization, "Bearer tvly-test");
  const removed = await updateEmployerList(deps, r.employers, { add: [], remove: ["nowhere inc"] });
  assert.deepStrictEqual(removed.employers.map(e => e.name), ["Paycom", "Devon Energy"]);
});

test("find_open_roles reads ATS feeds directly and other sites via Tavily + Firecrawl + Claude", async () => {
  const deps = { fetch: fakeWeb(), env, anthropic: fakeAnthropic };
  const { employers } = await updateEmployerList(deps, [], { add: ["Paycom", "Devon Energy"], remove: [] });
  const r = await findOpenRoles(deps, employers, { role: "hr", related_terms: ["talent acquisition", "recruiter"] });
  const paycom = r.groups.find(g => g.company === "Paycom");
  assert.strictEqual(paycom.via, "Greenhouse feed");
  assert.deepStrictEqual(paycom.roles.map(x => x.title), ["Talent Acquisition Partner", "HR Generalist"]);
  assert.strictEqual(paycom.roles[0].pay, "$60,000 - $75,000 per year");
  const devon = r.groups.find(g => g.company === "Devon Energy");
  assert.strictEqual(devon.via, "Tavily + Firecrawl");
  assert.deepStrictEqual(devon.roles.map(x => x.url), ["https://www.devonenergy.com/careers/job/hr-business-partner-123"]);
  assert.strictEqual(devon.roles[0].pay, "$85,000 - $105,000 per year");
});

test("find_open_roles degrades gracefully without Firecrawl or Tavily keys", async () => {
  const noFc = { fetch: fakeWeb(), env: { TAVILY_API_KEY: "t" }, anthropic: fakeAnthropic };
  const { employers } = await updateEmployerList(noFc, [], { add: ["Devon Energy"], remove: [] });
  const r = await findOpenRoles(noFc, employers, { role: "hr" });
  assert.ok(r.groups[0].roles.every(x => x.unverified));
  assert.match(r.warnings.join(" "), /FIRECRAWL_API_KEY/);
  const none = await findOpenRoles({ fetch: fakeWeb(), env: {}, anthropic: fakeAnthropic }, [{ name: "Acme" }], { role: "hr" });
  assert.match(none.warnings.join(" "), /TAVILY_API_KEY/);
  assert.strictEqual(none.groups[0].roles.length, 0);
});

test("cleanEmployers drops bad input and non-http URLs", () => {
  const out = cleanEmployers([{ name: " Paycom ", careersUrl: "javascript:alert(1)", extra: "x" }, { name: "" }, null, "junk"]);
  assert.deepStrictEqual(out, [{ name: "Paycom" }]);
});

test("runAgent wires both tools to the employer list and results", async () => {
  let seenParams;
  const anthropic = { ...fakeAnthropic, beta: { messages: { toolRunner: async params => {
    seenParams = params;
    const tool = n => params.tools.find(t => t.name === n);
    await tool("update_employer_list").run({ add: ["Paycom"], remove: [] });
    await tool("find_open_roles").run({ role: "hr", location: "", companies: [], related_terms: ["talent acquisition"] });
    return { stop_reason: "end_turn", content: [{ type: "text", text: "Found 2 HR roles at Paycom." }] };
  } } } };
  const out = await runAgent({ message: "Watch Paycom and find HR jobs", employers: [] }, { fetch: fakeWeb(), env, anthropic });
  assert.strictEqual(seenParams.model, "claude-opus-5-5");
  assert.strictEqual(seenParams.fallbacks, "default");
  assert.ok(!("tool_choice" in seenParams));
  assert.strictEqual(out.reply, "Found 2 HR roles at Paycom.");
  assert.strictEqual(out.employers[0].ats, "greenhouse");
  assert.strictEqual(out.results.groups[0].roles.length, 2);
});

test("GET /api/agent reports key presence without revealing values", async () => {
  const handler = require("../api/agent");
  const saved = { ...process.env };
  process.env.UCOMBA = "secret-claude"; process.env.TAVILY_API_KEY = "secret-tavily"; delete process.env.FIRECRAWL_API_KEY;
  let status, body;
  const res = { status(c) { status = c; return this; }, json(b) { body = b; return this; } };
  await handler({ method: "GET" }, res);
  process.env = saved;
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { ready: { claude: true, tavily: true, firecrawl: false } });
  assert.ok(!JSON.stringify(body).includes("secret"));
});

test("POST /api/agent shows Anthropic's reason when a request is rejected", async () => {
  const Anthropic = require("@anthropic-ai/sdk").default;
  const handler = require("../api/agent");
  const saved = { ...process.env };
  process.env.UCOMBA = "k";
  const orig = Anthropic.Beta.Messages.prototype.toolRunner;
  Anthropic.Beta.Messages.prototype.toolRunner = async () => {
    throw new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }, "400", new Headers());
  };
  let status, body;
  const res = { status(c) { status = c; return this; }, json(b) { body = b; return this; } };
  try { await handler({ method: "POST", body: { message: "hi", employers: [] } }, res); }
  finally { Anthropic.Beta.Messages.prototype.toolRunner = orig; process.env = saved; }
  assert.strictEqual(status, 502);
  assert.match(body.error, /credit balance is too low/);
});
