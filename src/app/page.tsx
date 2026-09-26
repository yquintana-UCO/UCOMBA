import AskGuide from "@/components/AskGuide";
import EventExplorer from "@/components/EventExplorer";
import PapelPicado from "@/components/PapelPicado";
import { todayInOkc } from "@/lib/dates";
import { getUpcomingEvents } from "@/lib/events";

// Re-check hourly so past events drop off and "Happening now" stays current.
export const revalidate = 3600;

export default async function Home() {
  const events = await getUpcomingEvents();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-16">
      <header className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-thunder-navy via-thunder-blue to-thunder-navy pb-10 text-center text-white shadow-lg">
        <PapelPicado />
        <div className="space-y-3 px-4 pt-4">
          <p className="text-xs font-bold tracking-[0.25em] text-thunder-sun uppercase sm:text-sm">
            Hispanic Heritage Month · Fall Festivals · Thunder Game Days
          </p>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            Fiesta <span className="text-thunder-orange drop-shadow">OKC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-white/85">
            Festivals, art exhibits, pumpkin patches, and Thunder home games across Oklahoma
            City, Norman, Edmond, and beyond — all on one map.
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-2">
          <span className="flex-1 bg-thunder-orange" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-thunder-blue" />
        </div>
      </header>

      <AskGuide />
      <EventExplorer events={events} today={todayInOkc()} />
    </main>
  );
}
