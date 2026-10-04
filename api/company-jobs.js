const { companyJobs } = require("./_lib/companyJobs");
const { cleanEmployers } = require("./agent");

// POST /api/company-jobs { employers } -> { jobs, companies }
// Reads the watched companies' public job feeds (Workday, Greenhouse, Lever, Ashby). Free to call.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const employers = cleanEmployers(req.body?.employers);
  try {
    const out = await companyJobs({ fetch, env: process.env }, employers);
    console.log("company-jobs", JSON.stringify(out.companies));
    res.status(200).json(out);
  } catch (err) {
    console.error("company-jobs error", String(err?.message || err).slice(0, 300));
    res.status(500).json({ error: "Couldn't read company job feeds." });
  }
};
