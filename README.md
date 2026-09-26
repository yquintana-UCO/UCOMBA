# Fiesta OKC

Fall, Hispanic Heritage Month, and Thunder game-day events in Oklahoma City and surrounding
towns: festivals, art exhibits, pumpkin patches, Thunder home games, and more, shown on a list, on a map, and through an AI guide
that answers questions in English or Spanish.

**Stack:** Next.js (App Router) · Tailwind CSS · Supabase · Vercel · Leaflet/OpenStreetMap · Anthropic / OpenAI / OpenRouter

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
```

Without Supabase keys the app shows the curated list in `src/lib/events-data.ts`, so it works before the database is set up.

## Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_events.sql`, then `supabase/seed.sql`.
3. Copy the project URL and anon key into `.env.local`.

Row Level Security is on: anyone can read published events; add or edit events from the
Supabase dashboard (or a future admin page using the service role).

### Updating events

Edit `src/lib/events-data.ts`, then run `npm run seed:generate` to rebuild `supabase/seed.sql`.
(Or add rows directly in the Supabase table editor.)

Date rules: `start_date` + `end_date` for a date range; only `end_date` for "now through";
neither for "date TBA". Past events drop off automatically.

> Map pins are approximate. "Directions" links use the street address. Thunder games are a
> partial list; confirm them at nba.com/thunder/schedule.

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
src/components/               EventExplorer, EventMap (Leaflet), AskGuide, PapelPicado
src/lib/ai/provider.ts        Anthropic / OpenAI / OpenRouter switch
src/lib/events.ts             Supabase query (falls back to events-data.ts)
src/lib/events-data.ts        Curated event list (source for seed.sql)
src/lib/dates.ts              Date ranges, "happening now", sorting
src/lib/supabase/server.ts    Supabase server client
supabase/                     SQL migration + generated seed
scripts/generate-seed.mjs     Builds seed.sql from events-data.ts
```
