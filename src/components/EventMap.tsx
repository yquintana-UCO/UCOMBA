"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import Link from "next/link";
import { directionsUrl } from "@/lib/links";
import type { OkcEvent } from "@/lib/types";

const OKC_CENTER: [number, number] = [35.4676, -97.5164];

export default function EventMap({
  events,
  showDetailsLink = true,
}: {
  events: OkcEvent[];
  showDetailsLink?: boolean;
}) {
  const pinned = events.filter((e) => e.lat != null && e.lng != null);

  return (
    <MapContainer
      center={OKC_CENTER}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPins points={pinned.map((e) => [e.lat!, e.lng!])} />
      {pinned.map((e) => (
        <CircleMarker
          key={e.id}
          center={[e.lat!, e.lng!]}
          radius={9}
          pathOptions={
            e.category === "sports"
              ? {
                  color: "#002d62",
                  fillColor: "#007ac1",
                  fillOpacity: 0.9,
                  weight: 2,
                }
              : {
                  color: "#ffffff",
                  fillColor: "#ef3b24",
                  fillOpacity: 0.9,
                  weight: 2,
                }
          }
        >
          <Popup>
            <strong>{e.title}</strong>
            <br />
            {[e.venue, e.city].filter(Boolean).join(", ")}
            {e.hours_text && (
              <>
                <br />
                {e.hours_text}
              </>
            )}
            <br />
            {showDetailsLink && (
              <>
                <Link href={`/events/${e.id}`}>Details</Link>
                {" · "}
              </>
            )}
            <a href={directionsUrl(e) ?? "#"} target="_blank" rel="noreferrer">
              Directions
            </a>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

/** Zoom the map so every visible event (OKC, Norman, Edmond, ...) is on screen. */
function FitToPins({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length > 1)
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}
