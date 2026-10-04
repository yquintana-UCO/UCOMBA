const test = require("node:test");
const assert = require("node:assert");
const { sanitizeHtml, classifyIndustry, fromMuse, fromRemotive, collectJobs } = require("../api/_lib/jobs");
const { getApiKey } = require("../api/_lib/config");

test("sanitizeHtml keeps simple formatting and strips everything dangerous", () => {
  assert.strictEqual(sanitizeHtml('<p class="x">Hi <strong>there</strong></p>'), "<p>Hi <strong>there</strong></p>");
  assert.strictEqual(sanitizeHtml("<script>alert(1)</script>ok"), "ok");
  assert.strictEqual(sanitizeHtml('<img src=x onerror="alert(1)">a'), "a");
  assert.strictEqual(sanitizeHtml('<a href="javascript:alert(1)">link</a>'), "link");
  assert.ok(!/<script/i.test(sanitizeHtml("<scr<script>ipt>alert(1)</script>")));
  assert.strictEqual(sanitizeHtml("<p onclick='x()'>t</p>"), "<p>t</p>");
});

test("classifyIndustry maps categories to industries", () => {
  assert.strictEqual(classifyIndustry("Software Engineering", "Platform Lead"), "Technology");
  assert.strictEqual(classifyIndustry("Nursing", "Registered Nurse"), "Healthcare");
  assert.strictEqual(classifyIndustry("Human Resources and Recruitment", "Site Commissioning Manager", "GE Vernova"), "Other");
  assert.strictEqual(classifyIndustry("Human Resources and Recruitment", "Warehouse Operator"), "Manufacturing & Logistics");
  assert.strictEqual(classifyIndustry("Accounting and Finance", "Senior Associate"), "Finance & Banking");
  assert.strictEqual(classifyIndustry("Something odd", ""), "Other");
});

test("fromMuse keeps Oklahoma and remote jobs, drops others", () => {
  const base = { id: 1, name: "Analyst", contents: "<p>x</p>", company: { name: "Acme" }, categories: [], levels: [], refs: { landing_page: "https://e.com" } };
  assert.strictEqual(fromMuse({ ...base, locations: [{ name: "Dallas, TX" }] }), null);
  const ok = fromMuse({ ...base, locations: [{ name: "Tulsa, OK" }, { name: "Dallas, TX" }] });
  assert.strictEqual(ok.location, "Tulsa, OK");
  assert.ok(ok.oklahoma && !ok.remote);
  const remote = fromMuse({ ...base, locations: [{ name: "Flexible / Remote" }] });
  assert.ok(remote.remote && !remote.oklahoma);
});

test("fromRemotive keeps US-eligible remote jobs only", () => {
  const base = { id: 2, title: "Dev", company_name: "R", category: "Software Development", url: "https://r.com", description: "<p>d</p>" };
  assert.strictEqual(fromRemotive({ ...base, candidate_required_location: "Germany" }), null);
  assert.ok(fromRemotive({ ...base, candidate_required_location: "USA" }).remote);
  assert.ok(fromRemotive({ ...base, candidate_required_location: "Worldwide" }));
});

test("collectJobs merges feeds and survives one feed failing", async () => {
  const fakeFetch = async url => {
    if (url.includes("remotive")) return { ok: false, status: 503 };
    const loc = url.includes("Flexible") ? "Flexible / Remote" : "Oklahoma City, OK";
    return { ok: true, json: async () => ({ results: [{ id: url.length, name: `Job ${loc}`, company: { name: "Co" }, locations: [{ name: loc }], categories: [], levels: [], contents: "", refs: {} }] }) };
  };
  const data = await collectJobs(fakeFetch);
  assert.strictEqual(data.jobs.length, 2); // deduped across pages
  assert.match(String(data.sources.Remotive), /error/);
  assert.ok(data.industries.includes("Other"));
});

test("getApiKey finds the UCOMBA variable without exposing others", () => {
  assert.deepStrictEqual(getApiKey({ UCOMBA: "k1" }), { name: "UCOMBA", value: "k1" });
  assert.strictEqual(getApiKey({ UCO_MBA_API_KEY: "k2" }).name, "UCO_MBA_API_KEY");
  assert.strictEqual(getApiKey({}), null);
});

test("fromRemotive rejects remote roles limited to other regions", () => {
  const base = { id: 3, title: "Dev", company_name: "R", category: "Software Development" };
  assert.strictEqual(fromRemotive({ ...base, candidate_required_location: "Remote - Europe" }), null);
  assert.strictEqual(fromRemotive({ ...base, candidate_required_location: "Latin America" }), null);
  assert.ok(fromRemotive({ ...base, candidate_required_location: "North America" }));
});

test("fetchMuse follows page_count but stops at the page cap", async () => {
  const calls = [];
  const fakeFetch = async url => {
    calls.push(url);
    if (url.includes("remotive")) return { ok: true, json: async () => ({ jobs: [] }) };
    const page = Number(new URL(url).searchParams.get("page"));
    const remote = url.includes("Flexible");
    return { ok: true, json: async () => ({ page_count: remote ? 1 : 40, results: [{ id: `${remote}-${page}`, name: `Job ${remote}-${page}`, company: { name: "Co" }, locations: [{ name: remote ? "Flexible / Remote" : "Tulsa, OK" }], categories: [], levels: [], contents: "", refs: {} }] }) };
  };
  const data = await collectJobs(fakeFetch);
  const general = calls.filter(u => u.includes("themuse") && !u.includes("category="));
  assert.strictEqual(general.filter(u => !u.includes("Flexible")).length, 15);
  assert.strictEqual(general.filter(u => u.includes("Flexible")).length, 1);
  assert.ok(data.jobs.filter(j => j.oklahoma).length >= 15);
});

test("HR roles get their own industry", () => {
  assert.strictEqual(classifyIndustry("Human Resources and Recruitment", "HR Generalist"), "Human Resources");
  assert.strictEqual(classifyIndustry("", "Technical Recruiter", "Acme Software"), "Human Resources");
  assert.strictEqual(classifyIndustry("", "People Operations Partner"), "Human Resources");
  assert.strictEqual(classifyIndustry("", "Three-Shift Supervisor"), "Other"); // "hr" must be a whole word
});

test("collectJobs also requests HR-specific feeds", async () => {
  const calls = [];
  const fakeFetch = async url => {
    calls.push(url);
    if (url.includes("remotive")) return { ok: true, json: async () => ({ jobs: url.includes("human-resources") ? [{ id: 7, title: "HR Business Partner", company_name: "Remote Co", category: "Human Resources", candidate_required_location: "USA" }] : [] }) };
    const hr = url.includes("category=Human+Resources");
    return { ok: true, json: async () => ({ page_count: 1, results: hr ? [{ id: 9, name: "Recruiter", company: { name: "Tulsa Co" }, locations: [{ name: "Tulsa, OK" }], categories: [{ name: "Human Resources and Recruitment" }], levels: [], contents: "", refs: {} }] : [] }) };
  };
  const data = await collectJobs(fakeFetch);
  assert.strictEqual(calls.filter(u => u.includes("category=Human+Resources")).length, 2);
  assert.ok(calls.some(u => u.includes("remotive") && u.includes("category=human-resources")));
  assert.deepStrictEqual(data.jobs.map(j => j.industry).sort(), ["Human Resources", "Human Resources"]);
});

test("trimDescription keeps long descriptions under the cap at a tag boundary", () => {
  const { trimDescription } = require("../api/_lib/jobs");
  const long = "<p>" + "word ".repeat(1000) + "</p>".repeat(1) + ("<p>" + "x".repeat(500) + "</p>").repeat(20);
  const out = trimDescription(long);
  assert.ok(out.length < 9000);
  assert.match(out, /Description shortened/);
  assert.strictEqual(trimDescription("<p>short</p>"), "<p>short</p>");
});

const usaItem = (over = {}) => ({ MatchedObjectId: "1", MatchedObjectDescriptor: {
  PositionID: "AF-123", PositionTitle: "Human Resources Specialist", OrganizationName: "Air Force Materiel Command",
  DepartmentName: "Department of the Air Force", PositionURI: "https://www.usajobs.gov/job/1", ApplyURI: ["https://www.usajobs.gov/job/1/apply"],
  PositionLocation: [{ LocationName: "Tinker AFB, Oklahoma", CountrySubDivisionCode: "Oklahoma" }],
  JobCategory: [{ Name: "Human Resources Management", Code: "0201" }], JobGrade: [{ Code: "GS" }],
  PositionRemuneration: [{ MinimumRange: "61111", MaximumRange: "79443", Description: "Per Year" }],
  PositionSchedule: [{ Name: "Full-time" }], PublicationStartDate: "2026-10-01",
  QualificationSummary: "Specialized experience <b>required</b>.",
  UserArea: { Details: { JobSummary: "Support civilian personnel.", MajorDuties: ["Advise managers", "Process actions"], RemoteIndicator: false } },
  ...over } });

test("fromUsaJobs maps federal jobs, keeps Oklahoma or remote, escapes text", () => {
  const { fromUsaJobs } = require("../api/_lib/jobs");
  const j = fromUsaJobs(usaItem());
  assert.strictEqual(j.industry, "Human Resources");
  assert.strictEqual(j.location, "Tinker AFB, Oklahoma");
  assert.ok(j.oklahoma && !j.remote);
  assert.strictEqual(j.salary, "$61,111–$79,443 Per Year");
  assert.strictEqual(j.url, "https://www.usajobs.gov/job/1/apply");
  assert.match(j.description, /<li>Advise managers<\/li>/);
  assert.ok(!j.description.includes("<b>"), "plain-text fields must be escaped, not rendered");
  assert.strictEqual(fromUsaJobs(usaItem({ PositionLocation: [{ LocationName: "Denver, Colorado", CountrySubDivisionCode: "Colorado" }] })), null);
  const other = fromUsaJobs(usaItem({ PositionTitle: "Park Ranger", OrganizationName: "National Park Service", DepartmentName: "Department of the Interior", JobCategory: [] }));
  assert.strictEqual(other.industry, "Government & Public Sector");
});

test("USAJOBS is skipped without a key and called with key headers when set", async () => {
  const seen = [];
  const fakeFetch = async (url, opts) => {
    seen.push({ url, headers: opts.headers });
    if (url.includes("usajobs")) return { ok: true, json: async () => ({ SearchResult: { SearchResultItems: [usaItem()] } }) };
    if (url.includes("remotive")) return { ok: true, json: async () => ({ jobs: [] }) };
    return { ok: true, json: async () => ({ page_count: 1, results: [] }) };
  };
  const off = await collectJobs(fakeFetch, {});
  assert.match(off.sources.USAJOBS, /not configured/);
  assert.ok(!seen.some(s => s.url.includes("usajobs")));
  const on = await collectJobs(fakeFetch, { USAJOBS_API_KEY: "k", USAJOBS_EMAIL: "me@example.edu" });
  const call = seen.find(s => s.url.includes("usajobs"));
  assert.strictEqual(call.headers["Authorization-Key"], "k");
  assert.strictEqual(call.headers["User-Agent"], "me@example.edu");
  assert.strictEqual(on.sources.USAJOBS, 1); // the two queries return the same job; deduped
  assert.strictEqual(on.jobs.length, 1);
});
