import type { OkcEvent } from "./types";

// Used only when Supabase env vars are missing, so the app runs out of the box.
// Mirrors supabase/seed.sql. These are placeholders, not confirmed events.
const base = { description: null, ends_at: null, url: null, image_url: null };

export const SAMPLE_EVENTS: OkcEvent[] = [
  { ...base, id: "s1", title: "[Sample] Fiestas de las Américas", description: "Parade, lowrider show, and live music celebrating Latin American heritage.", category: "festival", starts_at: "2026-10-03T10:00:00-05:00", venue: "Historic Capitol Hill", address: "SW 25th St & S Robinson Ave", city: "Oklahoma City", lat: 35.439, lng: -97.5165, price_text: "Free", is_free: true, tags: ["hispanic-heritage", "parade", "music"] },
  { ...base, id: "s2", title: "[Sample] Latino Art Walk", description: "Gallery night featuring Latino and Latina artists across the district.", category: "art", starts_at: "2026-10-09T18:00:00-05:00", venue: "Plaza District", address: "1700 NW 16th St", city: "Oklahoma City", lat: 35.489, lng: -97.546, price_text: "Free", is_free: true, tags: ["hispanic-heritage", "gallery"] },
  { ...base, id: "s3", title: "[Sample] Noche de Salsa en el Parque", description: "Beginner salsa lesson followed by a live band.", category: "dance", starts_at: "2026-10-10T19:00:00-05:00", venue: "Scissortail Park", address: "300 SW 7th St", city: "Oklahoma City", lat: 35.461, lng: -97.519, price_text: "$10", is_free: false, tags: ["salsa", "live-music"] },
  { ...base, id: "s4", title: "[Sample] Mercado de Otoño", description: "Fall market with local vendors, pan dulce, and crafts.", category: "market", starts_at: "2026-10-11T09:00:00-05:00", venue: "Calle Dos Cinco", address: "SW 25th St", city: "Oklahoma City", lat: 35.4392, lng: -97.523, price_text: "Free", is_free: true, tags: ["food", "shopping", "family"] },
  { ...base, id: "s5", title: "[Sample] Día de los Muertos Block Party", description: "Ofrendas, face painting, and mariachi.", category: "block_party", starts_at: "2026-11-01T16:00:00-05:00", venue: "Automobile Alley", address: "N Broadway Ave & NW 9th St", city: "Oklahoma City", lat: 35.477, lng: -97.513, price_text: "Free", is_free: true, tags: ["dia-de-los-muertos", "family", "music"] },
  { ...base, id: "s6", title: "[Sample] Taco Crawl Norman", description: "Self-guided taco tour through Campus Corner.", category: "food", starts_at: "2026-10-17T12:00:00-05:00", venue: "Campus Corner", address: "W Boyd St & S Asp Ave", city: "Norman", lat: 35.209, lng: -97.444, price_text: "$25", is_free: false, tags: ["food"] },
];
