import { formatDateRange } from "@/lib/dates";
import { HERITAGE_TAG, type OkcEvent } from "@/lib/types";

/** Date, status, and price chips shared by the event cards and the details page. */
export default function EventBadges({
  event: e,
  live,
}: {
  event: OkcEvent;
  live: boolean;
}) {
  const sports = e.category === "sports";
  const price = e.price_text ?? (e.is_free ? "Free" : null);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span
        className={
          sports ? "text-thunder-blue dark:text-sky-300" : "text-thunder-orange"
        }
      >
        {formatDateRange(e)}
      </span>
      {live && (
        <span className="rounded-full bg-thunder-orange px-2 py-0.5 text-white">
          Happening now
        </span>
      )}
      {e.tags.includes(HERITAGE_TAG) && (
        <span className="rounded-full bg-thunder-blue/10 px-2 py-0.5 text-thunder-blue dark:text-sky-300">
          Hispanic Heritage
        </span>
      )}
      {e.tags.includes("new") && (
        <span className="rounded-full bg-thunder-sun/25 px-2 py-0.5 text-amber-800 dark:text-thunder-sun">
          New
        </span>
      )}
      {price && (
        <span className="rounded-full bg-thunder-navy px-2 py-0.5 text-white dark:bg-white dark:text-thunder-navy">
          {price}
        </span>
      )}
    </div>
  );
}
