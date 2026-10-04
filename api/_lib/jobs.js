// Shared helpers for the /api/jobs function: fetch public job feeds,
// keep only Oklahoma or remote (US-eligible) roles, and normalize them
// into one standard job record.

const MUSE_URL = "https://www.themuse.com/api/public/jobs";
const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";

const OK_CITIES = [
  "Oklahoma City, OK", "Tulsa, OK", "Norman, OK", "Edmond, OK", "Broken Arrow, OK",
  "Stillwater, OK", "Lawton, OK", "Moore, OK", "Midwest City, OK", "Enid, OK",
  "Owasso, OK", "Shawnee, OK", "Bartlesville, OK", "Muskogee, OK", "Ardmore, OK"
];
const MUSE_REMOTE = "Flexible / Remote";

// First match wins, so more specific industries come first.
const INDUSTRY_RULES = [
  ["Aerospace & Defense", /aerospace|defen[cs]e|aviation|aircraft|air force|military|boeing|tinker|lockheed|northrop|raytheon/i],
  ["Healthcare", /health|nurs|medical|clinic|physician|pharm|therap|hospital|dental|patient|caregiver|integris|ssm/i],
  ["Energy", /energy|oil\b|natural gas|petroleum|utilit|electric|pipeline|power plant|solar|wind|devon|og&e|ong?ok|chesapeake|williams/i],
  ["Finance & Banking", /financ|accounting|accountant|bank|credit|audit|\btax|loan|insurance|actuar|payroll|bookkeep/i],
  ["Education", /educat|teach|school|universit|tutor|academ|instruct|curriculum/i],
  ["Government & Public Sector", /government|public sector|federal|state of|county|city of|municipal|usajobs/i],
  ["Nonprofit", /non-?profit|foundation|charity|ministry/i],
  ["Consulting", /consult|advisory/i],
  ["Media & Entertainment", /media|marketing|content|writ(er|ing)|journal|entertain|advertis|communications|copy|video|creative/i],
  ["Technology", /software|engineer|developer|data|\bit\b|devops|sysadmin|\bqa\b|product|computer|cyber|cloud|design|ux|ui|tech|programm/i],
  ["Manufacturing & Logistics", /manufactur|warehouse|plant|production|assembly|logistic|supply chain|transport|mechanic|driver|machin/i],
  ["Retail & Hospitality", /retail|store|customer service|customer support|hospitality|food|restaurant|consumer|cashier/i],
  ["Business & Professional Services", /sales|business|human resources|\bhr\b|recruit|project manag|operations|legal|admin|office|account manag|management/i]
];

const INDUSTRIES = INDUSTRY_RULES.map(([name]) => name).sort().concat("Other");

function classifyIndustry(...texts) {
  const hay = texts.filter(Boolean).join(" ");
  const hit = INDUSTRY_RULES.find(([, re]) => re.test(hay));
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
    description: sanitizeHtml(job.contents),
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
    description: sanitizeHtml(job.description),
    source: "Remotive",
    sourceUrl: "https://remotive.com"
  };
}

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: { "User-Agent": "UCO-Job-Scout/1.0" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function museUrl(locations, page) {
  const qs = new URLSearchParams({ page: String(page) });
  locations.forEach(l => qs.append("location", l));
  return `${MUSE_URL}?${qs}`;
}

// Fetch page 0, then every remaining page the feed reports (up to maxPages).
async function fetchMusePages(fetchImpl, locations, maxPages) {
  const first = await getJson(fetchImpl, museUrl(locations, 0));
  const total = Math.min(first.page_count || 1, maxPages);
  const rest = await Promise.allSettled(
    Array.from({ length: total - 1 }, (_, i) => getJson(fetchImpl, museUrl(locations, i + 1)))
  );
  return [first, ...rest.filter(p => p.status === "fulfilled").map(p => p.value)]
    .flatMap(page => page.results || []);
}

async function fetchMuse(fetchImpl, { okPages = 15, remotePages = 3 } = {}) {
  const [ok, remote] = await Promise.allSettled([
    fetchMusePages(fetchImpl, OK_CITIES, okPages),
    fetchMusePages(fetchImpl, [MUSE_REMOTE], remotePages)
  ]);
  if (ok.status === "rejected" && remote.status === "rejected") throw ok.reason;
  return [ok, remote].flatMap(r => (r.status === "fulfilled" ? r.value : []))
    .map(fromMuse).filter(Boolean);
}

async function fetchRemotive(fetchImpl, { limit = 150 } = {}) {
  const data = await getJson(fetchImpl, `${REMOTIVE_URL}?limit=${limit}`);
  return (data.jobs || []).map(fromRemotive).filter(Boolean);
}

async function collectJobs(fetchImpl = fetch) {
  const [muse, remotive] = await Promise.allSettled([fetchMuse(fetchImpl), fetchRemotive(fetchImpl)]);
  const sources = {
    "The Muse": muse.status === "fulfilled" ? muse.value.length : `error: ${muse.reason?.message}`,
    "Remotive": remotive.status === "fulfilled" ? remotive.value.length : `error: ${remotive.reason?.message}`
  };
  const all = [
    ...(muse.status === "fulfilled" ? muse.value : []),
    ...(remotive.status === "fulfilled" ? remotive.value : [])
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

module.exports = { collectJobs, classifyIndustry, sanitizeHtml, fromMuse, fromRemotive, INDUSTRIES, OK_CITIES };
