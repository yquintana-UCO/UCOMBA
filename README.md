# Fiesta OKC

Fall, Hispanic Heritage Month, and Thunder game-day events in Oklahoma City and surrounding
towns: festivals, art exhibits, pumpkin patches, Thunder home games, and more, shown on a
list and on a map, with a details page for each event.

**Stack:** Next.js (App Router) · Tailwind CSS · Supabase · Vercel · Leaflet/OpenStreetMap

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

## Event details & photos

Every event has its own page at `/events/<id>` with the full description, hours, cost,
"Good to know" tips, the official website, directions, an "Add to Google Calendar" link,
and a map.

To add a photo, put the file in `public/events/` (for example `mesta-festa.jpg`), then set
`image_url: "/events/mesta-festa.jpg"` and `image_credit` on that event in
`src/lib/events-data.ts`. Events without a photo show colorful category art instead.
Only use photos you took or have permission to use (organizers often share press photos).

## Deploy to Vercel

1. Import this repo in Vercel.
2. Add the same environment variables in Project → Settings → Environment Variables.
3. Deploy.

## Project layout

```
src/app/page.tsx              Home: hero, filters, list and map
src/app/events/[id]/page.tsx  Event details page
src/components/               EventExplorer, EventMap (Leaflet), EventImage, EventBadges, PapelPicado
src/lib/links.ts              Directions and Google Calendar links
src/lib/events.ts             Supabase query (falls back to events-data.ts)
src/lib/events-data.ts        Curated event list (source for seed.sql)
src/lib/dates.ts              Date ranges, "happening now", sorting
src/lib/supabase/server.ts    Supabase server client
supabase/                     SQL migration + generated seed
scripts/generate-seed.mjs     Builds seed.sql from events-data.ts
```
