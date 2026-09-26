import type { OkcEvent } from "./types";

/** Today's date in Oklahoma, YYYY-MM-DD. */
export function todayInOkc(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(now);
}

/** Still worth showing: ongoing, upcoming, or date not announced yet. */
export function isUpcoming(e: Pick<OkcEvent, "start_date" | "end_date">, today: string) {
  const last = e.end_date ?? e.start_date;
  return last == null || last >= today;
}

export function isHappeningNow(e: Pick<OkcEvent, "start_date" | "end_date">, today: string) {
  if (!e.end_date && !e.start_date) return false;
  return (e.start_date ?? "0000-00-00") <= today && today <= (e.end_date ?? e.start_date!);
}

/** Ongoing first, then by start date, with "date TBA" last. */
export function compareEvents(a: OkcEvent, b: OkcEvent) {
  const key = (e: OkcEvent) => e.start_date ?? (e.end_date ? "0000-00-00" : "9999-99-99");
  return key(a).localeCompare(key(b)) || (a.end_date ?? "").localeCompare(b.end_date ?? "");
}

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/** "Sat, Oct 3", "Oct 2 – Oct 18", "Now through Nov 1", or "Date TBA". */
export function formatDateRange({ start_date: s, end_date: e }: Pick<OkcEvent, "start_date" | "end_date">) {
  if (!s && !e) return "Date TBA";
  if (!s) return `Now through ${fmt(e!, { month: "short", day: "numeric", year: e!.slice(0, 4) !== "2026" ? "numeric" : undefined })}`;
  if (!e || e === s) return fmt(s, { weekday: "short", month: "short", day: "numeric" });
  return `${fmt(s, { month: "short", day: "numeric" })} – ${fmt(e, { month: "short", day: "numeric" })}`;
}
