import type { OkcEvent } from "./types";

/** Google Maps directions. Prefers the street address so navigation is exact where pins are approximate. */
export function directionsUrl(e: OkcEvent): string | null {
  if (e.address) return mapsDir(`${e.address}, ${e.city}, OK`);
  if (e.lat != null && e.lng != null) return mapsDir(`${e.lat},${e.lng}`);
  if (e.venue) return mapsDir(`${e.venue}, ${e.city}, OK`);
  return null;
}

const mapsDir = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

/** Google Calendar "add event" link (all-day across the event's dates). */
export function googleCalendarUrl(e: OkcEvent): string | null {
  if (!e.start_date) return null;
  const compact = (d: string) => d.replaceAll("-", "");
  const last = e.end_date ?? e.start_date;
  const next = new Date(`${last}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.start_date)}/${compact(next.toISOString().slice(0, 10))}`,
    details: [e.hours_text, e.description, e.url].filter(Boolean).join("\n\n"),
    location: [e.venue, e.address, e.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
