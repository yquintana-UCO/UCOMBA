import type { EventCategory, OkcEvent } from "@/lib/types";

const ART: Record<EventCategory, { emoji: string; from: string; to: string }> =
  {
    festival: { emoji: "🎉", from: "#ef3b24", to: "#002d62" },
    art: { emoji: "🎨", from: "#007ac1", to: "#ef3b24" },
    music: { emoji: "🎶", from: "#002d62", to: "#007ac1" },
    food: { emoji: "🌮", from: "#ef3b24", to: "#fdbb30" },
    block_party: { emoji: "🎃", from: "#ef3b24", to: "#002d62" },
    family: { emoji: "🎃", from: "#fdbb30", to: "#ef3b24" },
    dance: { emoji: "💃", from: "#ef3b24", to: "#007ac1" },
    film: { emoji: "🎬", from: "#002d62", to: "#ef3b24" },
    market: { emoji: "🛍️", from: "#007ac1", to: "#fdbb30" },
    sports: { emoji: "🏀", from: "#007ac1", to: "#002d62" },
    other: { emoji: "✨", from: "#007ac1", to: "#ef3b24" },
  };

function artFor(e: OkcEvent) {
  if (e.tags.includes("dia-de-los-muertos"))
    return { ...ART.festival, emoji: "💀" };
  if (e.tags.includes("pumpkins")) return { ...ART.family, emoji: "🎃" };
  if (e.id.includes("balloon")) return { ...ART.festival, emoji: "🎈" };
  if (e.id.includes("pinata") || e.id.includes("dale"))
    return { ...ART.art, emoji: "🪅" };
  return ART[e.category];
}

/** The event's photo, or colorful category art in team colors when there's no photo yet. */
export default function EventImage({
  event: e,
  className = "",
  showCredit = false,
}: {
  event: OkcEvent;
  className?: string;
  showCredit?: boolean;
}) {
  if (e.image_url) {
    return (
      <figure
        className={`relative overflow-hidden bg-thunder-navy ${className}`}
      >
        {/* Plain <img> so photos can come from any host or /public without extra config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={e.image_url}
          alt={e.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {showCredit && e.image_credit && (
          <figcaption className="absolute right-2 bottom-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
            Photo: {e.image_credit}
          </figcaption>
        )}
      </figure>
    );
  }

  const art = artFor(e);
  return (
    <div
      aria-hidden
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(#fff 1.5px, transparent 1.6px), radial-gradient(#fff 1.5px, transparent 1.6px)",
          backgroundSize: "22px 22px",
          backgroundPosition: "0 0, 11px 11px",
        }}
      />
      <span className="relative text-5xl drop-shadow-lg sm:text-6xl">
        {art.emoji}
      </span>
    </div>
  );
}
