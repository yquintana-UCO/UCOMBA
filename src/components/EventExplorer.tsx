"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { isHappeningNow } from "@/lib/dates";
import {
  CATEGORY_LABELS,
  HERITAGE_TAG,
  type EventCategory,
  type OkcEvent,
} from "@/lib/types";
import EventBadges from "./EventBadges";
import EventImage from "./EventImage";

// Leaflet touches `window`, so the map only renders in the browser.
const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl bg-thunder-blue/10" />
  ),
});

export default function EventExplorer({
  events,
  today,
}: {
  events: OkcEvent[];
  today: string;
}) {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [heritageOnly, setHeritageOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => e.category))),
    [events],
  );
  const visible = events.filter(
    (e) =>
      (category === "all" || e.category === category) &&
      (!heritageOnly || e.tags.includes(HERITAGE_TAG)) &&
      (!freeOnly || e.is_free),
  );

  return (
    <section id="events" className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
        <div className="ml-auto flex flex-wrap gap-4 text-sm">
          <Toggle checked={heritageOnly} onChange={setHeritageOnly}>
            Hispanic Heritage
          </Toggle>
          <Toggle checked={freeOnly} onChange={setFreeOnly}>
            Free only
          </Toggle>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <ul className="space-y-3 lg:max-h-[720px] lg:overflow-y-auto lg:pr-2">
          {visible.length === 0 && (
            <li className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
              No events match those filters yet.
            </li>
          )}
          {visible.map((e) => (
            <EventCard key={e.id} event={e} live={isHappeningNow(e, today)} />
          ))}
        </ul>
        <div className="order-first h-[320px] sm:h-[420px] lg:sticky lg:top-4 lg:order-none lg:h-[720px]">
          <EventMap events={visible} />
        </div>
      </div>
    </section>
  );
}

function EventCard({ event: e, live }: { event: OkcEvent; live: boolean }) {
  return (
    <li>
      <Link
        href={`/events/${e.id}`}
        className="group flex overflow-hidden rounded-xl border border-line bg-card shadow-sm transition hover:border-thunder-orange hover:shadow-md"
      >
        <EventImage event={e} className="w-24 shrink-0 sm:w-36" />
        <div className="min-w-0 flex-1 p-4">
          <EventBadges event={e} live={live} />
          <h3 className="mt-1 text-lg leading-snug font-bold group-hover:text-thunder-orange">
            {e.title}
          </h3>
          <p className="text-sm text-muted">
            {[e.hours_text, [e.venue, e.city].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {e.description && (
            <p className="mt-2 line-clamp-2 text-sm">{e.description}</p>
          )}
          <span className="mt-2 inline-block text-sm font-semibold text-thunder-blue dark:text-sky-300">
            Details, directions &amp; tickets →
          </span>
        </div>
      </Link>
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
        active
          ? "border-thunder-blue bg-thunder-blue text-white shadow"
          : "border-line bg-card hover:border-thunder-orange"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-thunder-orange"
      />
      {children}
    </label>
  );
}
