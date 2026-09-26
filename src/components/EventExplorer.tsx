"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS, type EventCategory, type OkcEvent } from "@/lib/types";

// Leaflet touches `window`, so the map only renders in the browser.
const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-orange-100" />,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

export default function EventExplorer({ events }: { events: OkcEvent[] }) {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [freeOnly, setFreeOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(events.map((e) => e.category))),
    [events],
  );
  const visible = events.filter(
    (e) => (category === "all" || e.category === category) && (!freeOnly || e.is_free),
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
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => setFreeOnly(e.target.checked)}
            className="accent-orange-600"
          />
          Free only
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-2">
          {visible.length === 0 && (
            <li className="rounded-xl border border-dashed p-6 text-center text-stone-500">
              No events match those filters yet.
            </li>
          )}
          {visible.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-orange-200 bg-white/80 p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/80"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{e.title}</h3>
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                  {e.price_text ?? (e.is_free ? "Free" : "")}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                {dateFmt.format(new Date(e.starts_at))} · {e.venue}, {e.city}
              </p>
              {e.description && <p className="mt-2 text-sm">{e.description}</p>}
            </li>
          ))}
        </ul>
        <div className="h-[420px] lg:h-[520px]">
          <EventMap events={visible} />
        </div>
      </div>
    </section>
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
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-orange-600 bg-orange-600 text-white"
          : "border-orange-300 hover:bg-orange-50 dark:border-stone-600 dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </button>
  );
}
