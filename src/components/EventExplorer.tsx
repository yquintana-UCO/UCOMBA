"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { formatDateRange, isHappeningNow } from "@/lib/dates";
import {
  CATEGORY_LABELS,
  HERITAGE_TAG,
  type EventCategory,
  type OkcEvent,
} from "@/lib/types";

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
  picks = [],
  onClearPicks,
}: {
  events: OkcEvent[];
  today: string;
  /** Event ids the AI guide recommended, best first. Non-empty = show only these. */
  picks?: string[];
  onClearPicks?: () => void;
}) {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [heritageOnly, setHeritageOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => e.category))),
    [events],
  );
  const byId = new Map(events.map((e) => [e.id, e]));
  const guided = picks.length > 0;
  const visible = guided
    ? picks.flatMap((id) => byId.get(id) ?? [])
    : events.filter(
        (e) =>
          (category === "all" || e.category === category) &&
          (!heritageOnly || e.tags.includes(HERITAGE_TAG)) &&
          (!freeOnly || e.is_free),
      );

  return (
    <section id="events" className="scroll-mt-4 space-y-6">
      {guided ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-thunder-orange px-4 py-3 font-semibold text-white shadow">
          <span>
            ✨ The guide picked {visible.length} event
            {visible.length === 1 ? "" : "s"} for you — see them on the map
          </span>
          <button
            type="button"
            onClick={onClearPicks}
            className="ml-auto rounded-full bg-white px-3 py-1 text-sm text-thunder-orange hover:bg-white/90"
          >
            Show all events
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
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
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-3 lg:max-h-[640px] lg:overflow-y-auto lg:pr-2">
          {visible.length === 0 && (
            <li className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
              No events match those filters yet.
            </li>
          )}
          {visible.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              live={isHappeningNow(e, today)}
              rank={guided ? picks.indexOf(e.id) + 1 : undefined}
            />
          ))}
        </ul>
        <div className="order-first h-[320px] sm:h-[420px] lg:order-none lg:sticky lg:top-4 lg:h-[640px]">
          <EventMap events={visible} />
        </div>
      </div>
    </section>
  );
}

function EventCard({
  event: e,
  live,
  rank,
}: {
  event: OkcEvent;
  live: boolean;
  rank?: number;
}) {
  const sports = e.category === "sports";
  const heritage = e.tags.includes(HERITAGE_TAG);
  const price = e.price_text ?? (e.is_free ? "Free" : null);

  return (
    <li
      className={`rounded-xl border border-line bg-card p-4 shadow-sm border-l-4 ${
        sports ? "border-l-thunder-blue" : "border-l-thunder-orange"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {rank && (
          <span className="rounded-full bg-thunder-orange px-2 py-0.5 text-white">
            ✨ Guide&apos;s pick #{rank}
          </span>
        )}
        <span className={sports ? "text-thunder-blue" : "text-thunder-orange"}>
          {formatDateRange(e)}
        </span>
        {live && (
          <span className="rounded-full bg-thunder-orange px-2 py-0.5 text-white">
            Happening now
          </span>
        )}
        {heritage && (
          <span className="rounded-full bg-thunder-blue/10 px-2 py-0.5 text-thunder-blue dark:text-sky-300">
            Hispanic Heritage
          </span>
        )}
        {e.tags.includes("new") && (
          <span className="rounded-full bg-thunder-sun/25 px-2 py-0.5 text-amber-800 dark:text-thunder-sun">
            New
          </span>
        )}
        {price && (
          <span className="rounded-full bg-thunder-navy px-2 py-0.5 text-white dark:bg-white dark:text-thunder-navy">
            {price}
          </span>
        )}
      </div>
      <h3 className="mt-1 text-lg font-bold leading-snug">{e.title}</h3>
      <p className="text-sm text-muted">
        {[e.hours_text, [e.venue, e.city].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {e.description && <p className="mt-2 text-sm">{e.description}</p>}
      {e.url && (
        <a
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-thunder-blue hover:underline dark:text-sky-300"
        >
          {sports ? "Full Thunder schedule →" : "More info →"}
        </a>
      )}
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
