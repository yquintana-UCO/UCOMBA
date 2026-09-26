export const CATEGORIES = [
  "festival",
  "art",
  "music",
  "food",
  "block_party",
  "family",
  "dance",
  "film",
  "market",
  "other",
] as const;

export type EventCategory = (typeof CATEGORIES)[number];

export type OkcEvent = {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  price_text: string | null;
  is_free: boolean;
  url: string | null;
  image_url: string | null;
  tags: string[];
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: "Festivals",
  art: "Art & Exhibits",
  music: "Music",
  food: "Food",
  block_party: "Block Parties",
  family: "Family",
  dance: "Dance",
  film: "Film",
  market: "Markets",
  other: "Other",
};
