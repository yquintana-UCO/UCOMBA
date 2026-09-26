"use client";

import { useState } from "react";
import type { OkcEvent } from "@/lib/types";
import AskGuide from "./AskGuide";
import EventExplorer from "./EventExplorer";

/** Connects the AI guide to the list and map: its picks reshape what's shown. */
export default function FiestaApp({
  events,
  today,
}: {
  events: OkcEvent[];
  today: string;
}) {
  const [picks, setPicks] = useState<string[]>([]);

  function handlePicks(ids: string[]) {
    setPicks(ids);
    if (ids.length > 0) {
      document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      <AskGuide onPicks={handlePicks} />
      <EventExplorer
        events={events}
        today={today}
        picks={picks}
        onClearPicks={() => setPicks([])}
      />
    </>
  );
}
