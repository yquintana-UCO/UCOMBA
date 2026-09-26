"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { OkcEvent } from "@/lib/types";

const OKC_CENTER: [number, number] = [35.4676, -97.5164];

export default function EventMap({ events }: { events: OkcEvent[] }) {
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
          pathOptions={{ color: "#9a3412", fillColor: "#f97316", fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{e.title}</strong>
            <br />
            {e.venue}, {e.city}
            <br />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}
              target="_blank"
              rel="noreferrer"
            >
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
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}
