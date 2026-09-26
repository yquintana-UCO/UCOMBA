"use client";

import dynamic from "next/dynamic";
import type { OkcEvent } from "@/lib/types";

// Leaflet touches `window`, so the map only renders in the browser.
const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl bg-thunder-blue/10" />
  ),
});

export default function EventMiniMap({ event }: { event: OkcEvent }) {
  return <EventMap events={[event]} showDetailsLink={false} />;
}
