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
  "sports",
  "other",
] as const;

export type EventCategory = (typeof CATEGORIES)[number];

export type OkcEvent = {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  /** Local calendar date, YYYY-MM-DD. Null with an end_date means "now through". */
  start_date: string | null;
  end_date: string | null;
  hours_text: string | null;
  venue: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  price_text: string | null;
  is_free: boolean;
  /** Official website or ticket page. */
  url: string | null;
  /** Photo URL, or a path under /public such as "/events/mesta-festa.jpg". */
  image_url: string | null;
  /** Photographer / source credit shown under the photo. */
  image_credit: string | null;
  /** "Good to know" bullets: parking, tickets, what's included, etc. */
  highlights: string[];
  tags: string[];
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: "Festivals",
  art: "Art & Exhibits",
  music: "Music",
  food: "Food",
  block_party: "Block Parties",
  family: "Family & Fall Fun",
  dance: "Dance",
  film: "Film",
  market: "Markets",
  sports: "Thunder & Sports",
  other: "Other",
};

export const HERITAGE_TAG = "hispanic-heritage";
