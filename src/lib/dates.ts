import type { OkcEvent } from "./types";

/** Today's date in Oklahoma, YYYY-MM-DD. */
export function todayInOkc(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(now);
}

/** Still worth showing: ongoing, upcoming, or date not announced yet. */
export function isUpcoming(
  e: Pick<OkcEvent, "start_date" | "end_date">,
  today: string,
) {
  const last = e.end_date ?? e.start_date;
  return last == null || last >= today;
}

export function isHappeningNow(
  e: Pick<OkcEvent, "start_date" | "end_date">,
  today: string,
) {
  if (!e.end_date && !e.start_date) return false;
  return (
    (e.start_date ?? "0000-00-00") <= today &&
    today <= (e.end_date ?? e.start_date!)
  );
}

/** Ongoing first, then by start date, with "date TBA" last. */
export function compareEvents(a: OkcEvent, b: OkcEvent) {
  const key = (e: OkcEvent) =>
    e.start_date ?? (e.end_date ? "0000-00-00" : "9999-99-99");
  return (
    key(a).localeCompare(key(b)) ||
    (a.end_date ?? "").localeCompare(b.end_date ?? "")
  );
}

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(
    new Date(`${d}T12:00:00Z`),
  );

/** "Sat, Oct 3", "Oct 2 – Oct 18", "Sep 5, 2026 – Jan 3, 2027", "Now through Nov 1", or "Date TBA". */
export function formatDateRange({
  start_date: s,
  end_date: e,
}: Pick<OkcEvent, "start_date" | "end_date">) {
  if (!s && !e) return "Date TBA";
  const crossesYear = !!s && !!e && s.slice(0, 4) !== e.slice(0, 4);
  const md = (d: string, withYear = false): string =>
    fmt(d, {
      month: "short",
      day: "numeric",
      year: withYear ? "numeric" : undefined,
    });
  if (!s) return `Now through ${md(e!, e!.slice(0, 4) !== "2026")}`;
  if (!e || e === s)
    return fmt(s, { weekday: "short", month: "short", day: "numeric" });
  return `${md(s, crossesYear)} – ${md(e, crossesYear)}`;
}

/** Long form for the details page: "Saturday, October 3, 2026". */
export function formatLongDate(d: string) {
  return fmt(d, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
