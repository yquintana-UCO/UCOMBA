import { SAMPLE_EVENTS } from "./sample-events";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { OkcEvent } from "./types";

/** Upcoming published events, soonest first. Falls back to sample data without Supabase. */
export async function getUpcomingEvents(limit = 100): Promise<OkcEvent[]> {
  if (!isSupabaseConfigured()) return SAMPLE_EVENTS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to load events", error);
    return [];
  }
  return data as OkcEvent[];
}
