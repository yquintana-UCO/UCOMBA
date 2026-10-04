// Jobs straight from the watched companies' own hiring systems, for the main job list.
// Only free public feeds are read here (Workday, Greenhouse, Lever, Ashby); no AI or paid search,
// so loading the page costs nothing. Companies on other careers sites are covered by Ask the Scout.

const { workdaySite, rolesFromWorkday, rolesFromGreenhouse, rolesFromLever, rolesFromAshby } = require("./scout");
const { classifyIndustry } = require("./jobs");

const MAX_COMPANIES = 15;
const WORKDAY_PAGES = 3; // 60 jobs per Workday company

const isOklahoma = loc => /,\s*OK\b|oklahoma/i.test(loc || "");
const isRemote = loc => /remote|anywhere|work from home/i.test(loc || "");

async function feedRows(deps, e) {
  const wd = workdaySite(e.feed) || workdaySite(e.careersUrl);
  if (wd) return { rows: await rolesFromWorkday(deps, wd, "", "", [], WORKDAY_PAGES), via: "Workday" };
  if (e.ats === "greenhouse" && e.atsSlug) return { rows: await rolesFromGreenhouse(deps, e, "", "", []), via: "Greenhouse" };
  if (e.ats === "lever" && e.atsSlug) return { rows: await rolesFromLever(deps, e, "", "", []), via: "Lever" };
  if (e.ats === "ashby" && e.atsSlug) return { rows: await rolesFromAshby(deps, e, "", "", []), via: "Ashby" };
  return null;
}

// Same record shape as the other sources in jobs.js, kept to Oklahoma and remote roles like the rest of the list.
function toJob(company, careersUrl, row) {
  const remote = isRemote(row.location);
  const oklahoma = isOklahoma(row.location);
  if (!remote && !oklahoma) return null;
  return {
    id: `co-${row.url}`,
    title: row.title,
    company,
    location: row.location || (remote ? "Remote" : ""),
    remote,
    oklahoma,
    industry: classifyIndustry("", row.title, company),
    category: "",
    level: "",
    type: "",
    salary: row.pay || "",
    posted: null,
    url: row.url,
    description: "",
    source: `${company} careers site`,
    sourceUrl: careersUrl || row.url
  };
}

async function companyJobs(deps, employers) {
  const list = employers.slice(0, MAX_COMPANIES);
  const results = await Promise.all(list.map(async e => {
    try {
      const feed = await feedRows(deps, e);
      if (!feed) return { company: e.name, jobs: [], status: "no public feed" };
      const jobs = feed.rows.map(r => toJob(e.name, e.careersUrl, r)).filter(Boolean);
      return { company: e.name, jobs, status: `${feed.via}: ${feed.rows.length} open, ${jobs.length} in Oklahoma or remote` };
    } catch (err) {
      return { company: e.name, jobs: [], status: `error: ${String(err.message).slice(0, 120)}` };
    }
  }));
  const seen = new Set();
  const jobs = results.flatMap(r => r.jobs).filter(j => !seen.has(j.url) && seen.add(j.url));
  return { jobs, companies: results.map(({ company, status, jobs: js }) => ({ company, status, count: js.length })) };
}

module.exports = { companyJobs, toJob };
