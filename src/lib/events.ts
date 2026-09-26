import { compareEvents, isUpcoming, todayInOkc } from "./dates";
import { EVENTS } from "./events-data";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { OkcEvent } from "./types";

/** Ongoing and upcoming published events. Falls back to the curated list if Supabase is unset or errors. */
export async function getUpcomingEvents(limit = 200): Promise<OkcEvent[]> {
  const today = todayInOkc();
  const curated = () =>
    EVENTS.filter((e) => isUpcoming(e, today)).sort(compareEvents).slice(0, limit);

  if (!isSupabaseConfigured()) return curated();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(
      `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}),and(end_date.is.null,start_date.is.null)`,
    )
    .limit(limit);

  // Never show an empty site because the database isn't ready (e.g. table not created yet).
  if (error) {
    console.error("Failed to load events from Supabase; using curated list", error);
    return curated();
  }
  return (data as OkcEvent[]).sort(compareEvents);
}
