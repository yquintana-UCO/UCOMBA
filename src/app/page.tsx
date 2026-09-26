import AskGuide from "@/components/AskGuide";
import EventExplorer from "@/components/EventExplorer";
import { getUpcomingEvents } from "@/lib/events";

export default async function Home() {
  const events = await getUpcomingEvents();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold tracking-widest text-orange-700 uppercase">
          Hispanic Heritage Month · Fall 2026
        </p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Fiesta <span className="text-orange-600">OKC</span>
        </h1>
        <p className="mx-auto max-w-2xl text-stone-600 dark:text-stone-300">
          Festivals, art exhibitions, block parties and more across Oklahoma City and
          surrounding towns — all on one map.
        </p>
      </header>

      <AskGuide />
      <EventExplorer events={events} />
    </main>
  );
}
