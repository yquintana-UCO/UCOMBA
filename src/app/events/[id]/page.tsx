import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventBadges from "@/components/EventBadges";
import EventImage from "@/components/EventImage";
import EventMiniMap from "@/components/EventMiniMap";
import { formatLongDate, isHappeningNow, todayInOkc } from "@/lib/dates";
import { EVENTS } from "@/lib/events-data";
import { getEvent } from "@/lib/events";
import { directionsUrl, googleCalendarUrl } from "@/lib/links";
import { CATEGORY_LABELS, type OkcEvent } from "@/lib/types";

export const revalidate = 3600;

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await getEvent((await params).id);
  if (!event) return { title: "Event not found · Fiesta OKC" };
  return {
    title: `${event.title} · Fiesta OKC`,
    description:
      event.description ?? `${event.title} in ${event.city}, Oklahoma.`,
  };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const event = await getEvent((await params).id);
  if (!event) notFound();

  const directions = directionsUrl(event);
  const calendar = googleCalendarUrl(event);
  const hasPin = event.lat != null && event.lng != null;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <Link
        href="/#events"
        className="text-sm font-semibold text-thunder-blue hover:underline dark:text-sky-300"
      >
        ← All events
      </Link>

      <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-md">
        <EventImage event={event} className="h-56 w-full sm:h-80" showCredit />
        <div className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-[0.2em] text-thunder-orange uppercase">
              {CATEGORY_LABELS[event.category]}
            </p>
            <h1 className="text-3xl leading-tight font-black sm:text-4xl">
              {event.title}
            </h1>
            <EventBadges
              event={event}
              live={isHappeningNow(event, todayInOkc())}
            />
          </div>

          {event.description && (
            <p className="text-lg leading-relaxed">{event.description}</p>
          )}

          <dl className="grid gap-4 rounded-xl bg-thunder-blue/5 p-5 sm:grid-cols-2">
            <Fact label="When">{whenText(event)}</Fact>
            {event.hours_text && <Fact label="Hours">{event.hours_text}</Fact>}
            <Fact label="Where">
              {[event.venue, event.address, event.city]
                .filter(Boolean)
                .join(", ")}
            </Fact>
            <Fact label="Cost">
              {event.price_text ??
                (event.is_free ? "Free" : "See the official site")}
            </Fact>
          </dl>

          {event.highlights.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold">Good to know</h2>
              <ul className="space-y-2">
                {event.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span aria-hidden className="text-thunder-orange">
                      ★
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            {event.url && (
              <Action href={event.url} primary>
                {event.category === "sports"
                  ? "Tickets & schedule"
                  : "Official website"}
              </Action>
            )}
            {directions && <Action href={directions}>Directions</Action>}
            {calendar && (
              <Action href={calendar}>Add to Google Calendar</Action>
            )}
          </div>
        </div>
      </article>

      {hasPin && (
        <div className="h-72 overflow-hidden rounded-2xl border border-line">
          <EventMiniMap event={event} />
        </div>
      )}

      <p className="text-xs text-muted">
        Details can change. Confirm times and prices with the organizer before
        you go.
      </p>
    </main>
  );
}

function whenText(e: OkcEvent) {
  if (!e.start_date && !e.end_date) return "Date to be announced";
  if (!e.start_date) return `Now through ${formatLongDate(e.end_date!)}`;
  if (!e.end_date || e.end_date === e.start_date)
    return formatLongDate(e.start_date);
  return `${formatLongDate(e.start_date)} – ${formatLongDate(e.end_date)}`;
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function Action({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
        primary
          ? "bg-thunder-orange text-white hover:brightness-110"
          : "border border-line bg-card hover:border-thunder-blue hover:text-thunder-blue"
      }`}
    >
      {children}
    </a>
  );
}
