// The Job Scout agent's two tools, minus the Claude loop (see agent.js):
//   updateEmployerList: save companies and find each one's job board from the name alone (Tavily).
//   findOpenRoles: search the saved companies' boards for a type of job. Public ATS feeds
//     (Greenhouse, Lever, Ashby) are read directly; any other careers site is searched with
//     Tavily, each posting is read with Firecrawl, and Claude pulls out title, location and pay.

const { z } = require("zod");
const { zodOutputFormat } = require("@anthropic-ai/sdk/helpers/zod");

const TAVILY_URL = "https://api.tavily.com/search";
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const MODEL = "claude-opus-5-5";

// Hosted applicant-tracking systems and how to read the company slug from a board URL.
const ATS = [
  { name: "greenhouse", re: /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/, slug: (p, url) => (p[0] === "embed" ? url.searchParams.get("for") : p[0]) },
  { name: "lever", re: /^jobs\.(?:eu\.)?lever\.co$/, slug: p => p[0] },
  { name: "ashby", re: /^jobs\.ashbyhq\.com$/, slug: p => p[0] },
  { name: "workday", re: /\.myworkdayjobs\.com$/, slug: () => null },
  { name: "smartrecruiters", re: /^(?:jobs|careers)\.smartrecruiters\.com$/, slug: p => p[0] },
  { name: "icims", re: /\.icims\.com$/, slug: () => null }
];
// Aggregators repost jobs; we want the employer's own board.
const AGGREGATORS = /(^|\.)(indeed|linkedin|glassdoor|ziprecruiter|monster|simplyhired|careerbuilder|builtin|wellfound|dice|salary|payscale|comparably|zippia|lensa|jooble|talent\.com|ladders|usajobs)\./i;

// Where large employers host individual postings, often on a different domain than their careers page.
const ATS_DOMAINS = ["myworkdayjobs.com", "icims.com", "ultipro.com", "ukg.net", "taleo.net", "oraclecloud.com",
  "successfactors.com", "greenhouse.io", "lever.co", "ashbyhq.com", "smartrecruiters.com", "paycomonline.net",
  "adp.com", "dayforcehcm.com", "jobvite.com", "applytojob.com", "paylocity.com", "bamboohr.com", "workable.com"];

const MAX_POSTINGS_TO_READ = 6;
const MAX_ROWS_PER_COMPANY = 15;
const MARKDOWN_CHARS_PER_POSTING = 6000;

class MissingKeyError extends Error {}

function parseUrl(u) {
  try { const url = new URL(u); return /^https?:$/.test(url.protocol) ? url : null; } catch { return null; }
}

function detectAts(u) {
  const url = parseUrl(u);
  if (!url) return { ats: null, atsSlug: null };
  const parts = url.pathname.split("/").filter(Boolean);
  const hit = ATS.find(a => a.re.test(url.hostname));
  return hit ? { ats: hit.name, atsSlug: hit.slug(parts, url) || null } : { ats: null, atsSlug: null };
}

// Keys pasted into Vercel sometimes carry spaces, quotes or a "Bearer " prefix; strip them.
function cleanKey(key) {
  return String(key || "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
}

async function postJson(fetchImpl, url, body, key, keyName) {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cleanKey(key)}` },
    body: JSON.stringify(body)
  });
  const host = new URL(url).hostname;
  if (res.status === 401 || res.status === 403) throw new Error(`${host} rejected ${keyName} (HTTP ${res.status}); check the key's value in Vercel`);
  if (!res.ok) throw new Error(`${host} returned HTTP ${res.status}`);
  return res.json();
}

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: { "User-Agent": "UCO-Job-Scout/1.0" } });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${res.status}`);
  return res.json();
}

async function tavilySearch(deps, query, { includeDomains, maxResults = 8 } = {}) {
  if (!deps.env.TAVILY_API_KEY) throw new MissingKeyError("TAVILY_API_KEY is not set");
  const body = { query, max_results: maxResults, search_depth: "basic" };
  if (includeDomains?.length) body.include_domains = includeDomains;
  const data = await postJson(deps.fetch, TAVILY_URL, body, deps.env.TAVILY_API_KEY, "TAVILY_API_KEY");
  return (data.results || []).filter(r => parseUrl(r.url));
}

async function firecrawlMarkdown(deps, url) {
  if (!deps.env.FIRECRAWL_API_KEY) throw new MissingKeyError("FIRECRAWL_API_KEY is not set");
  const data = await postJson(deps.fetch, FIRECRAWL_URL,
    { url, formats: ["markdown"], onlyMainContent: true }, deps.env.FIRECRAWL_API_KEY, "FIRECRAWL_API_KEY");
  return (data.data?.markdown || "").slice(0, MARKDOWN_CHARS_PER_POSTING);
}

// Pick the employer's own job board from search results: hosted ATS first, then a careers page.
function pickBoard(results) {
  const own = results.filter(r => !AGGREGATORS.test(parseUrl(r.url).hostname));
  const ats = own.find(r => detectAts(r.url).ats);
  if (ats) return ats.url;
  const careers = own.find(r => /career|jobs|join|opportunit|employment/i.test(r.url));
  return careers ? careers.url : null;
}

async function resolveEmployer(deps, name) {
  const results = await tavilySearch(deps, `${name} careers job openings`, { maxResults: 8 });
  const board = pickBoard(results);
  if (!board) return { name, careersUrl: null, domain: null, ats: null, atsSlug: null, note: "No job board found" };
  const url = parseUrl(board);
  return { name, careersUrl: url.href, domain: url.hostname, ...detectAts(url.href) };
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function updateEmployerList(deps, current, { add = [], remove = [] }) {
  let employers = current.filter(e => !remove.some(r => sameName(r, e.name)));
  const toAdd = [];
  for (const n of add.map(x => x.trim())) {
    if (n && ![...employers.map(e => e.name), ...toAdd].some(x => sameName(x, n))) toAdd.push(n);
  }
  employers = employers.concat(toAdd.map(name => ({ name })));
  const errors = [];
  // Find boards for every company we don't have one for yet, including ones added via the page.
  // Companies whose earlier lookup failed are retried, so a fixed key or outage recovers on its own.
  employers = await Promise.all(employers.map(async e => {
    if (e.careersUrl) return e;
    try { return await resolveEmployer(deps, e.name); }
    catch (err) {
      errors.push(`${e.name}: ${err.message}`);
      return err instanceof MissingKeyError ? e : { name: e.name, careersUrl: null, note: "Lookup failed" };
    }
  }));
  return { employers, added: toAdd, removed: remove, errors };
}

// ---------- reading roles ----------

const words = q => (q || "").toLowerCase().split(/[^a-z0-9+#&]+/).filter(w => w.length > 1);
// A role matches when every word of the request (or a close variant) appears in its title or team.
function matchesRole(text, role, related = []) {
  const hay = (text || "").toLowerCase();
  const want = words(role);
  if (!want.length) return true;
  if (related.some(r => hay.includes(r.toLowerCase()))) return true;
  return want.every(w => hay.includes(w) || hay.includes(w.replace(/s$/, "")));
}
// "Oklahoma City" matches "Oklahoma City, OK", and "Oklahoma City, OK" matches "Oklahoma City, Oklahoma".
const cityOf = s => (s || "").toLowerCase().split(",")[0].trim();
const matchesLocation = (loc, location) => !location || (loc || "").toLowerCase().includes(cityOf(location))
  || /remote/i.test(loc || "") && /remote/i.test(location);

const money = n => `$${Math.round(Number(n)).toLocaleString("en-US")}`;
function payFromText(text) {
  const m = (text || "").replace(/&nbsp;| /g, " ")
    .match(/\$\s?\d{2,3}(?:,\d{3})+(?:\.\d+)?(?:\s?(?:-|–|to)\s?\$\s?\d{2,3}(?:,\d{3})+(?:\.\d+)?)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr|annum))?/i);
  return m ? m[0].replace(/\s+/g, " ") : "";
}

async function rolesFromGreenhouse(deps, e, role, location, related) {
  const data = await getJson(deps.fetch, `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(e.atsSlug)}/jobs?content=true`);
  return (data.jobs || [])
    .filter(j => matchesRole(`${j.title} ${(j.departments || []).map(d => d.name).join(" ")}`, role, related))
    .filter(j => matchesLocation(j.location?.name, location))
    .map(j => ({ title: j.title, location: j.location?.name || "", pay: payFromText(j.content), url: j.absolute_url }));
}

async function rolesFromLever(deps, e, role, location, related) {
  const data = await getJson(deps.fetch, `https://api.lever.co/v0/postings/${encodeURIComponent(e.atsSlug)}?mode=json`);
  return (Array.isArray(data) ? data : [])
    .filter(j => matchesRole(`${j.text} ${j.categories?.team || ""} ${j.categories?.department || ""}`, role, related))
    .filter(j => matchesLocation(`${j.categories?.location || ""} ${j.workplaceType || ""}`, location))
    .map(j => {
      const s = j.salaryRange;
      const pay = s && s.min ? `${money(s.min)}–${money(s.max)}${s.interval ? " " + s.interval.replace(/-/g, " ") : ""}` : payFromText(j.descriptionPlain);
      return { title: j.text, location: j.categories?.location || j.workplaceType || "", pay, url: j.hostedUrl };
    });
}

async function rolesFromAshby(deps, e, role, location, related) {
  const data = await getJson(deps.fetch, `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(e.atsSlug)}?includeCompensation=true`);
  return (data.jobs || [])
    .filter(j => matchesRole(`${j.title} ${j.department || ""} ${j.team || ""}`, role, related))
    .filter(j => matchesLocation(`${j.location || ""} ${j.isRemote ? "remote" : ""}`, location))
    .map(j => ({ title: j.title, location: j.location || (j.isRemote ? "Remote" : ""),
      pay: j.compensation?.compensationTierSummary || "", url: j.jobUrl }));
}

const PostingSchema = z.object({
  postings: z.array(z.object({
    url: z.string(),
    is_job_posting: z.boolean().describe("false for search pages, category pages, or closed/expired postings"),
    title: z.string(),
    location: z.string().describe("City, state, or Remote; empty if not stated"),
    pay: z.string().describe("Pay range exactly as stated, e.g. $70,000-$90,000 per year; empty if not stated")
  }))
});

// Read postings with Firecrawl, then have Claude extract the details for all of them in one call.
async function extractPostings(deps, company, pages) {
  const docs = pages.map((p, i) => `<posting index="${i}" url="${p.url}">\n${p.markdown}\n</posting>`).join("\n\n");
  const response = await deps.anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(PostingSchema) },
    messages: [{ role: "user", content:
      `These pages were found on ${company}'s careers site. For each page, report whether it is a single open job posting ` +
      `and, if so, its job title, location and pay. Copy facts only from the page; leave a field empty when the page doesn't say. ` +
      `Return the url exactly as given.\n\n${docs}` }]
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return [];
  return response.parsed_output.postings.filter(p => p.is_job_posting && pages.some(pg => pg.url === p.url));
}

const squash = t => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const looksLikePosting = u => /job|position|requisition|opening|details|career.*\/\d|\/\d{4,}/i.test(u);

async function rolesFromCareersSite(deps, e, role, location, warnings, stats) {
  const query = `${e.name} ${role || ""} jobs ${location || ""}`.replace(/\s+/g, " ").trim();
  const own = e.domain ? e.domain.replace(/^www\./, "") : null;
  const found = await tavilySearch(deps, query, { includeDomains: own ? [own, ...ATS_DOMAINS] : undefined, maxResults: 15 });
  // Results on a shared ATS domain must name this company; results on its own domain always count.
  const key = squash(e.name.split(/\s+/)[0]);
  const mine = found.filter(r => {
    const host = parseUrl(r.url).hostname;
    if (own && (host === own || host.endsWith(`.${own}`))) return true;
    return squash(`${r.url} ${r.title} ${r.content}`).includes(key);
  });
  const candidates = mine.filter(r => r.url !== e.careersUrl)
    .sort((a, b) => looksLikePosting(b.url) - looksLikePosting(a.url)).slice(0, MAX_POSTINGS_TO_READ);
  Object.assign(stats, { found: found.length, candidates: candidates.length });
  if (!candidates.length) return [];
  if (!deps.env.FIRECRAWL_API_KEY) {
    warnings.add("FIRECRAWL_API_KEY is not set, so pages from company careers sites are listed without their details.");
    return candidates.map(r => ({ title: r.title, location: "", pay: "", url: r.url, unverified: true }));
  }
  const pages = (await Promise.allSettled(candidates.map(async r => ({ url: r.url, markdown: await firecrawlMarkdown(deps, r.url) }))))
    .filter(p => p.status === "fulfilled" && p.value.markdown).map(p => p.value);
  stats.read = pages.length;
  if (!pages.length) return [];
  const postings = await extractPostings(deps, e.name, pages);
  stats.postings = postings.length;
  return postings
    .filter(p => matchesLocation(p.location, location) || !p.location)
    .map(p => ({ title: p.title, location: p.location, pay: p.pay, url: p.url }));
}

async function rolesForEmployer(deps, e, role, location, related, warnings, stats = {}) {
  if (e.ats === "greenhouse" && e.atsSlug) return { rows: await rolesFromGreenhouse(deps, e, role, location, related), via: "Greenhouse feed" };
  if (e.ats === "lever" && e.atsSlug) return { rows: await rolesFromLever(deps, e, role, location, related), via: "Lever feed" };
  if (e.ats === "ashby" && e.atsSlug) return { rows: await rolesFromAshby(deps, e, role, location, related), via: "Ashby feed" };
  return { rows: await rolesFromCareersSite(deps, e, role, location, warnings, stats), via: "Tavily + Firecrawl" };
}

// "any jobs", "all openings", "general roles" and the like mean every open role.
const normalizeRole = r => /^\s*(any|all|every|general|open|available|current)?\s*(kinds? of\s*)?(jobs?|roles?|positions?|openings?|opportunities)?\s*$/i.test(r || "") ? "" : r.trim();

async function findOpenRoles(deps, employers, { role = "", location = "", companies = [], related_terms = [] }) {
  role = normalizeRole(role);
  if (!role) related_terms = [];
  const warnings = new Set();
  // Boards for companies added from the page (names only) are looked up on first use.
  const { employers: resolved, errors } = await updateEmployerList(deps, employers, {});
  errors.forEach(e => warnings.add(e));
  const targets = companies.length ? resolved.filter(e => companies.some(c => sameName(c, e.name))) : resolved;
  const groups = await Promise.all(targets.map(async e => {
    if (!e.careersUrl) return { company: e.name, careersUrl: null, via: "", roles: [], error: e.note || "No job board found yet" };
    try {
      const stats = {};
      const { rows, via } = await rolesForEmployer(deps, e, role, location, related_terms, warnings, stats);
      const seen = new Set();
      const roles = rows.filter(r => parseUrl(r.url) && !seen.has(r.url) && seen.add(r.url)).slice(0, MAX_ROWS_PER_COMPANY);
      return { company: e.name, careersUrl: e.careersUrl, via, roles, stats };
    } catch (err) {
      if (err instanceof MissingKeyError) warnings.add(`${err.message}, so ${e.name}'s careers site couldn't be searched.`);
      return { company: e.name, careersUrl: e.careersUrl, via: "", roles: [], error: err instanceof MissingKeyError ? "Search key missing" : "Couldn't read this job board" };
    }
  }));
  return { role, location, employers: resolved, groups, warnings: [...warnings] };
}

module.exports = {
  updateEmployerList, findOpenRoles, resolveEmployer, detectAts, pickBoard, matchesRole, payFromText,
  extractPostings, MissingKeyError, MODEL, cleanKey, normalizeRole
};
