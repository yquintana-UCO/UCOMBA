import { compareEvents, isUpcoming, todayInOkc } from "./dates";
import { EVENTS } from "./events-data";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { OkcEvent } from "./types";

/** Ongoing and upcoming published events. Falls back to the curated list without Supabase. */
export async function getUpcomingEvents(limit = 200): Promise<OkcEvent[]> {
  const today = todayInOkc();

  if (!isSupabaseConfigured()) {
    return EVENTS.filter((e) => isUpcoming(e, today)).sort(compareEvents).slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(
      `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}),and(end_date.is.null,start_date.is.null)`,
    )
    .limit(limit);

  if (error) {
    console.error("Failed to load events", error);
    return [];
  }
  return (data as OkcEvent[]).sort(compareEvents);
}
