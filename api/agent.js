const Anthropic = require("@anthropic-ai/sdk").default;
const { betaZodTool } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { z } = require("zod");
const { getApiKey } = require("./_lib/config");
const { updateEmployerList, findOpenRoles, MODEL } = require("./_lib/scout");

const MAX_MESSAGE_CHARS = 1000;
const MAX_EMPLOYERS = 15;

const SYSTEM = `You are Job Scout, an assistant that finds open jobs at the companies a user chooses.

You have two tools:
- update_employer_list: call it whenever the user names companies to watch (or to stop watching). It saves them and finds each company's job board from the name alone.
- find_open_roles: call it when the user asks about a type of job. It searches the saved companies' job boards. Pass related_terms with common alternative titles for the role (for "HR": recruiter, talent acquisition, people operations, benefits) so close matches aren't missed.

If the user names companies and asks about a job in the same message, call update_employer_list first, then find_open_roles.
If no companies are saved yet and the user asks about jobs, ask them which companies to search.

The page shows the full results as a comparison table grouped by company, with links, so don't repeat the table. Reply in 2-4 plain sentences: how many roles were found at which companies, anything notable (pay ranges, remote options), and any company whose board couldn't be found or read. Only report jobs the tools returned; never invent postings.`;

function cleanEmployers(list) {
  if (!Array.isArray(list)) return [];
  const str = v => (typeof v === "string" ? v.slice(0, 300) : null);
  const httpUrl = v => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; } };
  return list.slice(0, MAX_EMPLOYERS).filter(e => e && str(e.name)?.trim()).map(e => ({
    name: str(e.name).trim(), careersUrl: httpUrl(e.careersUrl), domain: str(e.domain),
    ats: str(e.ats), atsSlug: str(e.atsSlug), note: str(e.note)
  })).map(e => Object.fromEntries(Object.entries(e).filter(([, v]) => v)));
}

function makeTools(deps, state) {
  const updateTool = betaZodTool({
    name: "update_employer_list",
    description: "Save companies the user wants to watch, or remove ones they no longer want. Finds each new company's job board from its name.",
    inputSchema: z.object({
      add: z.array(z.string()).describe("Company names to start watching; empty if none"),
      remove: z.array(z.string()).describe("Company names to stop watching; empty if none")
    }),
    run: async ({ add, remove }) => {
      const result = await updateEmployerList(deps, state.employers, { add: add.slice(0, MAX_EMPLOYERS), remove });
      state.employers = result.employers.slice(0, MAX_EMPLOYERS);
      return JSON.stringify({
        saved: state.employers.map(e => ({ name: e.name, job_board: e.careersUrl || null, system: e.ats || null, note: e.note || null })),
        errors: result.errors
      });
    }
  });

  const findTool = betaZodTool({
    name: "find_open_roles",
    description: "Search the saved companies' job boards for a type of job. Returns title, location, pay and link for each posting, grouped by company.",
    inputSchema: z.object({
      role: z.string().describe("The kind of job, e.g. 'HR manager' or 'financial analyst'"),
      location: z.string().describe("City, state or 'Remote' if the user named one; otherwise empty"),
      companies: z.array(z.string()).describe("Limit to these saved companies; empty for all"),
      related_terms: z.array(z.string()).describe("Alternative job titles that also count as a match")
    }),
    run: async input => {
      if (!state.employers.length) return JSON.stringify({ error: "No companies are saved yet." });
      const result = await findOpenRoles(deps, state.employers, input);
      state.employers = result.employers;
      state.results = result;
      return JSON.stringify({
        groups: result.groups.map(g => ({
          company: g.company, count: g.roles.length, error: g.error || null,
          roles: g.roles.map(r => ({ title: r.title, location: r.location, pay: r.pay }))
        })),
        warnings: result.warnings
      });
    }
  });
  return [updateTool, findTool];
}

async function runAgent({ message, employers }, deps) {
  const state = { employers: cleanEmployers(employers), results: null };
  const saved = state.employers.length ? state.employers.map(e => e.name).join(", ") : "none";
  const final = await deps.anthropic.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SYSTEM,
    tools: makeTools(deps, state),
    messages: [{ role: "user", content: `Saved companies: ${saved}\n\nUser request: ${message}` }],
    max_iterations: 5
  });
  const reply = final.stop_reason === "refusal"
    ? "Sorry, I can't help with that request."
    : final.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  return { reply, employers: state.employers, results: state.results };
}

// Which keys the server can see (true/false only, never values). Free to call.
function keyStatus(env = process.env) {
  return { claude: !!getApiKey(env), tavily: !!env.TAVILY_API_KEY, firecrawl: !!env.FIRECRAWL_API_KEY };
}

// GET /api/agent -> key status; POST /api/agent { message, employers } -> { reply, employers, results }
module.exports = async (req, res) => {
  if (req.method === "GET") return res.status(200).json({ ready: keyStatus() });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: `Send a message of 1-${MAX_MESSAGE_CHARS} characters.` });
  }
  const key = getApiKey();
  if (!key) return res.status(503).json({ error: "The UCOMBA API key isn't configured on the server." });
  const deps = { anthropic: new Anthropic({ apiKey: key.value }), fetch, env: process.env };
  const started = Date.now();
  try {
    const out = await runAgent({ message, employers: req.body.employers }, deps);
    // One summary line per request for the Vercel runtime logs (no keys, no message text).
    console.log("scout", JSON.stringify({
      ms: Date.now() - started, keys: keyStatus(),
      employers: out.employers.map(e => ({ name: e.name, board: !!e.careersUrl, ats: e.ats || null })),
      groups: out.results ? out.results.groups.map(g => ({ company: g.company, roles: g.roles.length, via: g.via, error: g.error || null })) : null,
      warnings: out.results ? out.results.warnings : []
    }));
    res.status(200).json(out);
  } catch (err) {
    console.error("scout error", err?.constructor?.name, err?.status || "", String(err?.message || err).slice(0, 300));
    if (err instanceof Anthropic.AuthenticationError) return res.status(502).json({ error: "The UCOMBA API key was rejected." });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Too many requests right now. Try again in a minute." });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `Claude API error (${err.status}).` });
    res.status(500).json({ error: "The scout hit an unexpected error." });
  }
};

module.exports.runAgent = runAgent;
module.exports.cleanEmployers = cleanEmployers;
