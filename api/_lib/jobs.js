// Shared helpers for the /api/jobs function: fetch public job feeds,
// keep only Oklahoma or remote (US-eligible) roles, and normalize them
// into one standard job record.

const MUSE_URL = "https://www.themuse.com/api/public/jobs";
const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";
const USAJOBS_URL = "https://data.usajobs.gov/api/search";
// Federal occupational series 0201 = Human Resources Management.
const USAJOBS_HR_SERIES = "0201";

const OK_CITIES = [
  "Oklahoma City, OK", "Tulsa, OK", "Norman, OK", "Edmond, OK", "Broken Arrow, OK",
  "Stillwater, OK", "Lawton, OK", "Moore, OK", "Midwest City, OK", "Enid, OK",
  "Owasso, OK", "Shawnee, OK", "Bartlesville, OK", "Muskogee, OK", "Ardmore, OK"
];
const MUSE_REMOTE = "Flexible / Remote";
// Fetched on its own so HR roles aren't crowded out by larger fields.
const MUSE_HR_CATEGORY = "Human Resources and Recruitment";
const REMOTIVE_HR_CATEGORY = "human-resources";

// First match wins, so more specific industries come first.
const INDUSTRY_RULES = [
  ["Aerospace & Defense", /aerospace|defen[cs]e|aviation|aircraft|air force|military|boeing|tinker|lockheed|northrop|raytheon/i],
  ["Healthcare", /health|nurs|medical|clinic|physician|pharm|therap|hospital|dental|patient|caregiver|integris|ssm/i],
  ["Energy", /energy|oil\b|natural gas|petroleum|utilit|electric|pipeline|power plant|solar|wind|devon|og&e|ong?ok|chesapeake|williams/i],
  ["Finance & Banking", /financ|accounting|accountant|bank|credit|audit|\btax|loan|insurance|actuar|bookkeep/i],
  ["Human Resources", /human resources|\bhr\b|\bhris\b|recruit|talent|people (operations|ops|partner|team)|benefits|compensation|payroll|employee relations|onboarding specialist|workforce/i],
  ["Education", /educat|teach|school|universit|tutor|academ|instruct|curriculum/i],
  ["Government & Public Sector", /government|public sector|federal|state of|county|city of|municipal|usajobs/i],
  ["Nonprofit", /non-?profit|foundation|charity|ministry/i],
  ["Consulting", /consult|advisory/i],
  ["Media & Entertainment", /media|marketing|content|writ(er|ing)|journal|entertain|advertis|communications|copy|video|creative/i],
  ["Technology", /software|engineer|developer|data|\bit\b|devops|sysadmin|\bqa\b|product|computer|cyber|cloud|design|\bux\b|\bui\b|tech|programm/i],
  ["Manufacturing & Logistics", /manufactur|warehouse|plant|production|assembly|logistic|supply chain|transport|mechanic|driver|machin/i],
  ["Retail & Hospitality", /retail|store|customer service|customer support|hospitality|food|restaurant|consumer|cashier/i],
  ["Business & Professional Services", /sales|business|project manag|operations|legal|admin|office|account manag|management/i]
];

const INDUSTRIES = INDUSTRY_RULES.map(([name]) => name).sort().concat("Other");

// The job title decides first. The feed's category and the company name are only a fallback, and
// never on their own make a job "Human Resources": The Muse files many unrelated roles under its
// "Human Resources and Recruitment" category.
function classifyIndustry(category, title, company) {
  const byTitle = INDUSTRY_RULES.find(([, re]) => re.test(title || ""));
  if (byTitle) return byTitle[0];
  const hay = [category, company].filter(Boolean).join(" ");
  const hit = INDUSTRY_RULES.find(([name, re]) => name !== "Human Resources" && re.test(hay));
  return hit ? hit[0] : "Other";
}

// Allow only simple formatting tags with no attributes; escape everything else.
const ALLOWED_TAGS = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "h5"]);
function sanitizeHtml(html) {
  if (!html) return "";
  const cleaned = String(html).replace(/<(script|style|iframe|noscript|object|embed|template)\b[\s\S]*?<\/\1\s*>/gi, "");
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;
  const esc = s => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let out = "", last = 0;
  for (const m of cleaned.matchAll(tagRe)) {
    out += esc(cleaned.slice(last, m.index));
    const tag = m[2].toLowerCase();
    if (ALLOWED_TAGS.has(tag)) out += `<${m[1]}${tag}>`;
    last = m.index + m[0].length;
  }
  return out + esc(cleaned.slice(last));
}

// Keep the payload well under Vercel's 4.5 MB response limit; the full text is on the employer's page.
const MAX_DESCRIPTION = 8000;
function trimDescription(html) {
  if (html.length <= MAX_DESCRIPTION) return html;
  const cut = Math.max(html.lastIndexOf("</p>", MAX_DESCRIPTION), html.lastIndexOf("</li>", MAX_DESCRIPTION));
  const head = cut > 0 ? html.slice(0, html.indexOf(">", cut) + 1) : html.slice(0, MAX_DESCRIPTION);
  return head + "<p><em>Description shortened. See the full posting on the employer's site.</em></p>";
}

const isOklahoma = loc => /,\s*OK\b|oklahoma/i.test(loc || "");
// Remote roles that a candidate living in Oklahoma can take.
const US_ELIGIBLE = /^\s*$|usa|united states|\bus\b|u\.s\.|north america|americas|worldwide|anywhere|global/i;

function fromMuse(job) {
  const locations = (job.locations || []).map(l => l.name);
  const remote = locations.some(l => /remote|flexible/i.test(l));
  const okLocs = locations.filter(isOklahoma);
  if (!remote && okLocs.length === 0) return null;
  const category = (job.categories || []).map(c => c.name).join(", ");
  return {
    id: `muse-${job.id}`,
    title: job.name,
    company: job.company?.name || "Unknown company",
    location: okLocs.length ? okLocs.join(" · ") : "Remote (US)",
    remote,
    oklahoma: okLocs.length > 0,
    industry: classifyIndustry(category, job.name, job.company?.name),
    category,
    level: (job.levels || []).map(l => l.name).join(", "),
    type: job.type || "",
    salary: "",
    posted: job.publication_date || null,
    url: job.refs?.landing_page || "",
    description: trimDescription(sanitizeHtml(job.contents)),
    source: "The Muse",
    sourceUrl: "https://www.themuse.com"
  };
}

function fromRemotive(job) {
  const where = job.candidate_required_location || "";
  if (!US_ELIGIBLE.test(where)) return null;
  return {
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name || "Unknown company",
    location: where ? `Remote (${where})` : "Remote",
    remote: true,
    oklahoma: isOklahoma(where),
    industry: classifyIndustry(job.category, job.title, job.company_name),
    category: job.category || "",
    level: "",
    type: (job.job_type || "").replace(/_/g, " "),
    salary: job.salary || "",
    posted: job.publication_date || null,
    url: job.url || "",
    description: trimDescription(sanitizeHtml(job.description)),
    source: "Remotive",
    sourceUrl: "https://remotive.com"
  };
}

const escText = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fromUsaJobs(item) {
  const d = item.MatchedObjectDescriptor || {};
  const details = d.UserArea?.Details || {};
  const okLocs = (d.PositionLocation || [])
    .filter(l => /oklahoma/i.test(l.CountrySubDivisionCode || "") || isOklahoma(l.LocationName))
    .map(l => l.LocationName);
  const remote = details.RemoteIndicator === true || /remote/i.test(d.PositionLocationDisplay || "");
  if (!remote && okLocs.length === 0) return null;
  const pay = (d.PositionRemuneration || [])[0];
  const money = n => `$${Math.round(Number(n)).toLocaleString("en-US")}`;
  const salary = pay && pay.MinimumRange
    ? `${money(pay.MinimumRange)}–${money(pay.MaximumRange)} ${pay.Description || ""}`.trim() : "";
  const agency = d.OrganizationName || d.DepartmentName || "U.S. Federal Government";
  const category = (d.JobCategory || []).map(c => c.Name).join(", ");
  const industry = classifyIndustry(category, d.PositionTitle, `${agency} ${d.DepartmentName || ""}`);
  const duties = (details.MajorDuties || []).filter(Boolean);
  const description = [
    details.JobSummary && `<h3>Summary</h3><p>${escText(details.JobSummary)}</p>`,
    duties.length && `<h3>Duties</h3><ul>${duties.map(x => `<li>${escText(x)}</li>`).join("")}</ul>`,
    d.QualificationSummary && `<h3>Qualifications</h3><p>${escText(d.QualificationSummary)}</p>`,
    d.ApplicationCloseDate && `<p><strong>Applications close:</strong> ${escText(new Date(d.ApplicationCloseDate).toDateString())}</p>`
  ].filter(Boolean).join("");
  return {
    id: `usajobs-${d.PositionID || item.MatchedObjectId}`,
    title: d.PositionTitle || "Federal position",
    company: agency,
    location: okLocs.length ? [...new Set(okLocs)].join(" · ") : "Remote (US)",
    remote,
    oklahoma: okLocs.length > 0,
    industry: industry === "Other" ? "Government & Public Sector" : industry,
    category,
    level: (d.JobGrade || []).map(g => g.Code).join(", "),
    type: (d.PositionSchedule || []).map(p => p.Name).join(", "),
    salary,
    posted: d.PublicationStartDate || null,
    url: (d.ApplyURI || [])[0] || d.PositionURI || "",
    description: trimDescription(sanitizeHtml(description)),
    source: "USAJOBS",
    sourceUrl: "https://www.usajobs.gov"
  };
}

async function getJson(fetchImpl, url, headers = {}) {
  const res = await fetchImpl(url, { headers: { "User-Agent": "UCO-Job-Scout/1.0", ...headers } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function museUrl(locations, page, category) {
  const qs = new URLSearchParams({ page: String(page) });
  locations.forEach(l => qs.append("location", l));
  if (category) qs.append("category", category);
  return `${MUSE_URL}?${qs}`;
}

// Fetch page 0, then every remaining page the feed reports (up to maxPages).
async function fetchMusePages(fetchImpl, locations, maxPages, category) {
  const first = await getJson(fetchImpl, museUrl(locations, 0, category));
  const total = Math.min(first.page_count || 1, maxPages);
  const rest = await Promise.allSettled(
    Array.from({ length: total - 1 }, (_, i) => getJson(fetchImpl, museUrl(locations, i + 1, category)))
  );
  return [first, ...rest.filter(p => p.status === "fulfilled").map(p => p.value)]
    .flatMap(page => page.results || []);
}

async function fetchMuse(fetchImpl, { okPages = 15, remotePages = 3, hrPages = 5 } = {}) {
  const results = await Promise.allSettled([
    fetchMusePages(fetchImpl, OK_CITIES, okPages),
    fetchMusePages(fetchImpl, [MUSE_REMOTE], remotePages),
    fetchMusePages(fetchImpl, OK_CITIES, hrPages, MUSE_HR_CATEGORY),
    fetchMusePages(fetchImpl, [MUSE_REMOTE], hrPages, MUSE_HR_CATEGORY)
  ]);
  if (results.every(r => r.status === "rejected")) throw results[0].reason;
  return results.flatMap(r => (r.status === "fulfilled" ? r.value : []))
    .map(fromMuse).filter(Boolean);
}

async function fetchRemotive(fetchImpl, { limit = 150 } = {}) {
  const results = await Promise.allSettled([
    getJson(fetchImpl, `${REMOTIVE_URL}?limit=${limit}`),
    getJson(fetchImpl, `${REMOTIVE_URL}?category=${REMOTIVE_HR_CATEGORY}`)
  ]);
  if (results.every(r => r.status === "rejected")) throw results[0].reason;
  return results.flatMap(r => (r.status === "fulfilled" ? r.value.jobs || [] : []))
    .map(fromRemotive).filter(Boolean);
}

// USAJOBS needs a free key (https://developer.usajobs.gov) and the email it was registered with.
// Without both, the source is skipped and the rest of the feed still works.
async function fetchUsaJobs(fetchImpl, env = process.env) {
  const key = env.USAJOBS_API_KEY, email = env.USAJOBS_EMAIL;
  if (!key || !email) return null;
  const headers = { "Authorization-Key": key, "User-Agent": email };
  const queries = [
    new URLSearchParams({ LocationName: "Oklahoma", ResultsPerPage: "500" }),
    new URLSearchParams({ RemoteIndicator: "True", JobCategoryCode: USAJOBS_HR_SERIES, ResultsPerPage: "250" })
  ];
  const results = await Promise.allSettled(queries.map(q => getJson(fetchImpl, `${USAJOBS_URL}?${q}`, headers)));
  if (results.every(r => r.status === "rejected")) throw results[0].reason;
  const jobs = results.flatMap(r => (r.status === "fulfilled" ? r.value.SearchResult?.SearchResultItems || [] : []))
    .map(fromUsaJobs).filter(Boolean);
  // An Oklahoma job can also come back in the remote-HR query.
  return [...new Map(jobs.map(j => [j.id, j])).values()];
}

async function collectJobs(fetchImpl = fetch, env = process.env) {
  const [muse, remotive, usajobs] = await Promise.allSettled([
    fetchMuse(fetchImpl), fetchRemotive(fetchImpl), fetchUsaJobs(fetchImpl, env)
  ]);
  const count = r => (r.status === "fulfilled" ? r.value.length : `error: ${r.reason?.message}`);
  const sources = { "The Muse": count(muse), "Remotive": count(remotive) };
  sources.USAJOBS = usajobs.status === "fulfilled" && usajobs.value === null
    ? "not configured (set USAJOBS_API_KEY and USAJOBS_EMAIL)" : count(usajobs);
  const all = [
    ...(muse.status === "fulfilled" ? muse.value : []),
    ...(remotive.status === "fulfilled" ? remotive.value : []),
    ...(usajobs.status === "fulfilled" && usajobs.value ? usajobs.value : [])
  ];
  // Same role posted on both feeds: keep the first one.
  const seen = new Set();
  const jobs = all.filter(j => {
    const key = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0));
  return { jobs, sources, industries: INDUSTRIES, updatedAt: new Date().toISOString() };
}

module.exports = { collectJobs, classifyIndustry, sanitizeHtml, trimDescription, fromMuse, fromRemotive, fromUsaJobs, INDUSTRIES, OK_CITIES };
