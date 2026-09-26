-- Events that power the listing, the map, and the AI guide.
create type event_category as enum (
  'festival', 'art', 'music', 'food', 'block_party', 'family', 'dance', 'film', 'market', 'sports', 'other'
);

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     event_category not null default 'other',
  -- Dates are local (America/Chicago) calendar days.
  -- start_date null + end_date set  => ongoing, "now through <end_date>"
  -- both null                       => date not announced yet
  start_date   date,
  end_date     date,
  hours_text   text,            -- e.g. "Noon–6 p.m.", "Weekends only"
  venue        text,
  address      text,
  city         text not null default 'Oklahoma City',
  lat          double precision,
  lng          double precision,
  price_text   text,            -- e.g. "Free", "$15 per child, $5 per adult"
  is_free      boolean not null default false,
  url          text,            -- official website / tickets
  image_url    text,            -- photo URL or /events/<file> in public/
  image_credit text,
  highlights   text[] not null default '{}',  -- "Good to know" bullets
  tags         text[] not null default '{}',
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index events_start_date_idx on public.events (start_date);
create index events_end_date_idx on public.events (end_date);
create index events_category_idx on public.events (category);

-- Public can read published events; writes go through the service role / dashboard.
alter table public.events enable row level security;

create policy "Published events are readable by everyone"
  on public.events for select
  using (published = true);
