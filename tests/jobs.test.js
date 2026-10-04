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
  assert.strictEqual(classifyIndustry("Software Engineering"), "Technology");
  assert.strictEqual(classifyIndustry("Nursing", "Registered Nurse"), "Healthcare");
  assert.strictEqual(classifyIndustry("Accounting and Finance"), "Finance & Banking");
  assert.strictEqual(classifyIndustry("Something odd"), "Other");
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
