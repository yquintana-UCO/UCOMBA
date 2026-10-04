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
const AGGREGATORS = /(^|\.)(indeed|linkedin|glassdoor|ziprecruiter|monster|simplyhired|careerbuilder|builtin|wellfound|dice|salary|payscale|comparably|zippia|lensa|jooble|talent|ladders|usajobs|jobzmall|jobleads|jobilize|learn4good|whatjobs|adzuna|snagajob|bebee|ihire|careerjet|recruit|wikipedia|cnbc|forbes|bloomberg|reuters|yahoo|nytimes|businessinsider|prnewswire|bizjournals|facebook|instagram|twitter|youtube|reddit)\./i;
// Bump when board picking changes, so boards saved by older versions are looked up again.
const BOARD_VERSION = 2;

// Where large employers host individual postings, often on a different domain than their careers page.
const ATS_DOMAINS = ["myworkdayjobs.com", "icims.com", "ultipro.com", "ukg.net", "taleo.net", "oraclecloud.com",
  "successfactors.com", "greenhouse.io", "lever.co", "ashbyhq.com", "smartrecruiters.com", "paycomonline.net",
  "adp.com", "dayforcehcm.com", "jobvite.com", "applytojob.com", "paylocity.com", "bamboohr.com", "workable.com"];

const MAX_POSTINGS_TO_READ = 6;
const MAX_ROWS_PER_COMPANY = 15;
const MARKDOWN_CHARS_PER_POSTING = 6000;
const MARKDOWN_CHARS_PER_BOARD = 15000;

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
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000)
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

async function tavilySearch(deps, query, { includeDomains, maxResults = 8, rawContent = false } = {}) {
  if (!deps.env.TAVILY_API_KEY) throw new MissingKeyError("TAVILY_API_KEY is not set");
  const body = { query, max_results: maxResults, search_depth: "basic" };
  if (rawContent) body.include_raw_content = "markdown";
  if (includeDomains?.length) body.include_domains = includeDomains;
  const data = await postJson(deps.fetch, TAVILY_URL, body, deps.env.TAVILY_API_KEY, "TAVILY_API_KEY");
  return (data.results || []).filter(r => parseUrl(r.url));
}

async function firecrawlMarkdown(deps, url, maxChars = MARKDOWN_CHARS_PER_POSTING) {
  if (!deps.env.FIRECRAWL_API_KEY) throw new MissingKeyError("FIRECRAWL_API_KEY is not set");
  const data = await postJson(deps.fetch, FIRECRAWL_URL,
    { url, formats: ["markdown"], onlyMainContent: true, timeout: 20000 }, deps.env.FIRECRAWL_API_KEY, "FIRECRAWL_API_KEY");
  return (data.data?.markdown || "").slice(0, maxChars);
}

const squash = t => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const NAME_STOPWORDS = new Set(["the", "inc", "llc", "co", "company", "corp", "corporation", "group"]);
// The distinctive part of a company name: "Love's Travel Stops" -> "loves", "OG&E" -> "oge".
const nameKey = name => squash((name || "").split(/\s+/).find(w => !NAME_STOPWORDS.has(w.toLowerCase())) || name);

// How clearly a search result is this company's own job board. Aggregators, news and social sites never count.
function boardScore(r, name) {
  const url = parseUrl(r.url);
  if (!url || AGGREGATORS.test(url.hostname)) return -1;
  const key = nameKey(name), full = squash(name);
  let score = 0;
  if (key) {
    const labels = url.hostname.toLowerCase().split(".").map(squash);
    if (labels.some(l => l === key || l === full || (l.startsWith(key) && l.length <= key.length + 4))) score += 4;
    if (squash(`${r.title} ${r.content}`).includes(key)) score += 2;
  }
  if (detectAts(url.href).ats && (!key || squash(url.href).includes(key))) score += 5;
  if (/career|jobs|join|opportunit|employment/i.test(url.href)) score += 1;
  return score;
}

// Pick the employer's own job board from search results: its hosted hiring system or its own careers page.
function pickBoard(results, name = "") {
  const best = results.map(r => ({ url: r.url, score: boardScore(r, name) }))
    .filter(b => b.score >= (name ? 3 : 1)).sort((a, b) => b.score - a.score)[0];
  return best ? best.url : null;
}

async function resolveEmployer(deps, name) {
  const results = await tavilySearch(deps, `${name} careers job openings`, { maxResults: 10 });
  const board = pickBoard(results, name);
  if (!board) return { name, careersUrl: null, domain: null, ats: null, atsSlug: null, note: "No job board found" };
  const url = parseUrl(board);
  return { name, careersUrl: url.href, domain: url.hostname, ...detectAts(url.href), v: BOARD_VERSION };
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
    if (e.careersUrl && e.v === BOARD_VERSION) return e;
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

const JobsSchema = z.object({
  jobs: z.array(z.object({
    url: z.string().describe("The job's own link as shown on the page, or the page url for a single posting"),
    title: z.string(),
    location: z.string().describe("City, state, or Remote; empty if not stated"),
    pay: z.string().describe("Pay range exactly as stated, e.g. $70,000-$90,000 per year; empty if not stated")
  }))
});

// Have Claude list the open jobs on the pages we read (job lists and single postings), in one call.
async function extractPostings(deps, company, pages) {
  const docs = pages.map((p, i) => `<page index="${i}" url="${p.url}">\n${p.markdown}\n</page>`).join("\n\n");
  const response = await deps.anthropic.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(JobsSchema) },
    messages: [{ role: "user", content:
      `These pages come from ${company}'s careers site and hiring system. List the open jobs they show, at most 30. ` +
      `A page may be a single job posting or a list of jobs. Use each job's own link when the page shows one; for a single ` +
      `posting use the page url. Skip closed or expired jobs, search forms, navigation and other companies' jobs. ` +
      `Copy facts only from the pages; leave a field empty when the page doesn't say.\n\n${docs}` }]
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return [];
  // Keep only links that really appear in what we read, so no posting is invented.
  const seenText = pages.map(p => `${p.url} ${p.markdown}`).join(" ");
  return response.parsed_output.jobs.filter(j => parseUrl(j.url) && j.title && seenText.includes(j.url.replace(/\/$/, "")));
}

const looksLikePosting = u => /job|position|requisition|opening|details|career.*\/\d|\/\d{4,}/i.test(u);

async function rolesFromCareersSite(deps, e, role, location, related, warnings, stats) {
  const query = `${e.name} ${role || ""} jobs ${location || ""}`.replace(/\s+/g, " ").trim();
  const own = e.domain ? e.domain.replace(/^www\./, "") : null;
  const found = await tavilySearch(deps, query, { includeDomains: own ? [own, ...ATS_DOMAINS] : undefined, maxResults: 15, rawContent: true });
  // Results on a shared ATS domain must name this company; results on its own domain always count.
  const key = nameKey(e.name);
  const mine = found.filter(r => {
    const host = parseUrl(r.url).hostname;
    if (own && (host === own || host.endsWith(`.${own}`))) return true;
    return squash(`${r.url} ${r.title} ${r.content}`).includes(key);
  });
  const candidates = mine.filter(r => r.url !== e.careersUrl)
    .sort((a, b) => looksLikePosting(b.url) - looksLikePosting(a.url)).slice(0, MAX_POSTINGS_TO_READ - 1);
  Object.assign(stats, { found: found.length, candidates: candidates.length });
  // The job board itself usually lists openings, so read it along with the postings the search found.
  const toRead = [{ url: e.careersUrl, raw: "", board: true }, ...candidates.map(r => ({ url: r.url, raw: r.raw_content || "" }))];
  const readErrors = [];
  const pages = (await Promise.all(toRead.map(async p => {
    if (p.raw.length > 400) return { url: p.url, markdown: p.raw.slice(0, MARKDOWN_CHARS_PER_POSTING) };
    if (!deps.env.FIRECRAWL_API_KEY) return null;
    try { return { url: p.url, markdown: await firecrawlMarkdown(deps, p.url, p.board ? MARKDOWN_CHARS_PER_BOARD : MARKDOWN_CHARS_PER_POSTING) }; }
    catch (err) { readErrors.push(err.name === "TimeoutError" ? "Firecrawl timed out" : err.message); return null; }
  }))).filter(p => p && p.markdown);
  stats.read = pages.length;
  if (readErrors.length) {
    stats.readError = readErrors[0];
    if (!pages.length) warnings.add(`Couldn't open ${e.name}'s job pages: ${readErrors[0]}.`);
  }
  if (!pages.length) {
    if (!deps.env.FIRECRAWL_API_KEY) warnings.add("FIRECRAWL_API_KEY is not set, so pages from company careers sites are listed without their details.");
    return candidates.filter(r => looksLikePosting(r.url)).map(r => ({ title: r.title, location: "", pay: "", url: r.url, unverified: true }));
  }
  const jobs = await extractPostings(deps, e.name, pages);
  stats.postings = jobs.length;
  return jobs
    .filter(j => matchesRole(j.title, role, related))
    .filter(j => matchesLocation(j.location, location) || !j.location)
    .map(j => ({ title: j.title, location: j.location, pay: j.pay, url: j.url }));
}

async function rolesForEmployer(deps, e, role, location, related, warnings, stats = {}) {
  if (e.ats === "greenhouse" && e.atsSlug) return { rows: await rolesFromGreenhouse(deps, e, role, location, related), via: "Greenhouse feed" };
  if (e.ats === "lever" && e.atsSlug) return { rows: await rolesFromLever(deps, e, role, location, related), via: "Lever feed" };
  if (e.ats === "ashby" && e.atsSlug) return { rows: await rolesFromAshby(deps, e, role, location, related), via: "Ashby feed" };
  return { rows: await rolesFromCareersSite(deps, e, role, location, related, warnings, stats), via: "Tavily + Firecrawl" };
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
  extractPostings, MissingKeyError, MODEL, cleanKey, normalizeRole, BOARD_VERSION
};
