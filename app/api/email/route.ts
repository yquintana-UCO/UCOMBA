import { z } from "zod";
import { isRecipientAllowed, sendResultsEmail } from "@/lib/email";

export const runtime = "nodejs";

const Body = z.object({
  to: z.email(),
  subject: z.string().min(1).max(200),
  markdown: z.string().min(1).max(50_000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  const { to, subject, markdown } = parsed.data;
  if (!isRecipientAllowed(to)) {
    return Response.json(
      { error: "This address isn't on the app's allowed list. Ask the admin to add it to EMAIL_ALLOWLIST." },
      { status: 403 },
    );
  }

  try {
    await sendResultsEmail(to, subject, markdown);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : "Email failed to send." }, { status: 502 });
  }
}
