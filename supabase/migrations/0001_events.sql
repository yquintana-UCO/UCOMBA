-- Events that power the listing, the map, and the AI guide.
create type event_category as enum (
  'festival', 'art', 'music', 'food', 'block_party', 'family', 'dance', 'film', 'market', 'other'
);

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     event_category not null default 'other',
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  venue        text,
  address      text,
  city         text not null default 'Oklahoma City',
  lat          double precision,
  lng          double precision,
  price_text   text,            -- e.g. "Free", "$10", "$5–$15"
  is_free      boolean not null default false,
  url          text,
  image_url    text,
  tags         text[] not null default '{}',
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create index events_category_idx on public.events (category);

-- Public can read published events; writes go through the service role / dashboard.
alter table public.events enable row level security;

create policy "Published events are readable by everyone"
  on public.events for select
  using (published = true);
