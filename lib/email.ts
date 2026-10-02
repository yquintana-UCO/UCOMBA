import { Marked } from "marked";
import { Resend } from "resend";

/**
 * EMAIL_ALLOWLIST is a comma-separated list of addresses ("me@uco.edu") and/or
 * domains ("@uco.edu"). Without it, anyone who finds the app could use it to send email.
 */
export function isRecipientAllowed(email: string, allowlist = process.env.EMAIL_ALLOWLIST ?? ""): boolean {
  const address = email.trim().toLowerCase();
  const entries = allowlist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return entries.some((entry) => (entry.startsWith("@") ? address.endsWith(entry) : address === entry));
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Raw HTML inside the markdown is shown as text, never rendered.
const markdown = new Marked({ gfm: true, renderer: { html: ({ text }) => escapeHtml(text) } });

const STYLES = `
  body { margin:0; background:#f4f6f8; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#1f2933; }
  .wrap { max-width:680px; margin:0 auto; padding:24px 16px; }
  .card { background:#ffffff; border-radius:12px; padding:24px; line-height:1.55; font-size:15px; }
  .brand { font-weight:700; color:#0f766e; font-size:14px; letter-spacing:.04em; text-transform:uppercase; margin-bottom:12px; }
  h1,h2,h3,h4 { line-height:1.3; margin:20px 0 8px; } h3 { font-size:18px; } h4 { font-size:15px; }
  a { color:#0f766e; }
  table { border-collapse:collapse; width:100%; margin:12px 0; font-size:14px; }
  th,td { border:1px solid #e3e8ee; padding:8px 10px; text-align:left; vertical-align:top; }
  th { background:#f0fdfa; }
  .foot { color:#7b8794; font-size:12px; margin-top:16px; text-align:center; }
`;

export async function renderEmailHtml(md: string): Promise<string> {
  const body = await markdown.parse(md);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STYLES}</style></head>
<body><div class="wrap"><div class="card"><div class="brand">Job Scout</div>${body}</div>
<div class="foot">Sent from Job Scout. Salary figures marked "Estimate" are market estimates, not offers.</div></div></body></html>`;
}

export async function sendResultsEmail(to: string, subject: string, md: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM.");
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject,
    html: await renderEmailHtml(md),
    text: md,
  });
  if (error) throw new Error(error.message);
}
