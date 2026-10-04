const { collectJobs } = require("./_lib/jobs");
const { getApiKey } = require("./_lib/config");

// GET /api/jobs: Oklahoma-based and remote (US-eligible) jobs from public feeds.
// Cached at Vercel's edge for 6 hours to respect the feeds' rate limits.
module.exports = async (req, res) => {
  try {
    const data = await collectJobs();
    // Report only whether the key is present and which variable it came from, never the value.
    const key = getApiKey();
    data.apiKey = key ? { configured: true, variable: key.name } : { configured: false };
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: "Could not load jobs", detail: String(err.message || err) });
  }
};
