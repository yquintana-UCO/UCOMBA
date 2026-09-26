# Fiesta OKC

Fall and Hispanic Heritage Month events in Oklahoma City and surrounding towns: festivals,
art exhibits, block parties, and more, shown on a list, on a map, and through an AI guide
that answers questions in English or Spanish.

**Stack:** Next.js (App Router) · Tailwind CSS · Supabase · Vercel · Leaflet/OpenStreetMap · Anthropic / OpenAI / OpenRouter

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
```

Without Supabase keys the app shows built-in **sample** events, so you can build the UI first.

## Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_events.sql`, then optionally `supabase/seed.sql`.
3. Copy the project URL and anon key into `.env.local`.

Row Level Security is on: anyone can read published events; add or edit events from the
Supabase dashboard (or a future admin page using the service role).

> The seed rows are **placeholders** at real OKC venues. The events and dates are not
> confirmed; replace them with verified listings before launch.

## AI guide (`POST /api/ask`)

`src/lib/ai/provider.ts` wraps all three providers behind one `generateText()` call.
Switch providers by changing the `AI_PROVIDER` variable only; no code changes needed.

| `AI_PROVIDER` | Key variable         | Default model               |
|---------------|----------------------|-----------------------------|
| `anthropic`   | `ANTHROPIC_API_KEY`  | `claude-sonnet-5`           |
| `openai`      | `OPENAI_API_KEY`     | `gpt-5-mini`                |
| `openrouter`  | `OPENROUTER_API_KEY` | `anthropic/claude-sonnet-5` |

The route loads upcoming events from Supabase and has the model answer **only from that
list**, so it won't make up events. API keys stay on the server.

```bash
curl -X POST localhost:3000/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"Free family events this weekend?"}'
```

## Deploy to Vercel

1. Import this repo in Vercel.
2. Add the same environment variables in Project → Settings → Environment Variables.
3. Deploy.

## Project layout

```
src/app/page.tsx              Home: hero, AI guide, filters, list and map
src/app/api/ask/route.ts      AI guide endpoint
src/components/               EventExplorer, EventMap (Leaflet), AskGuide
src/lib/ai/provider.ts        Anthropic / OpenAI / OpenRouter switch
src/lib/events.ts             Supabase query (falls back to sample data)
src/lib/supabase/server.ts    Supabase server client
supabase/                     SQL migration + placeholder seed
```
