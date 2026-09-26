import type { OkcEvent } from "./types";

// Curated fall 2026 listings. This is the source for supabase/seed.sql
// (run `npm run seed:generate`) and the fallback when Supabase isn't configured.
// Details were checked against organizer sites and local listings in Sept. 2026.
// Map pins are approximate; "Directions" links use the street address.
//
// Photos: set image_url to a file in public/events/ (e.g. "/events/mesta-festa.jpg")
// or to a URL you have permission to use, and fill in image_credit.

type Input = Partial<OkcEvent> & Pick<OkcEvent, "id" | "title" | "category">;

const e = (x: Input): OkcEvent => ({
  description: null,
  start_date: null,
  end_date: null,
  hours_text: null,
  venue: null,
  address: null,
  city: "Oklahoma City",
  lat: null,
  lng: null,
  price_text: null,
  is_free: false,
  url: null,
  image_url: null,
  image_credit: null,
  highlights: [],
  tags: [],
  ...x,
});

const SCISSORTAIL = {
  venue: "Scissortail Park",
  address: "300 SW 7th St",
  lat: 35.461,
  lng: -97.519,
};

const PAYCOM = {
  venue: "Paycom Center",
  address: "100 W Reno Ave",
  lat: 35.4634,
  lng: -97.5151,
  url: "https://www.nba.com/thunder/schedule",
  highlights: [
    "Downtown OKC, walkable from Bricktown and Scissortail Park",
    "Tickets and tip times: nba.com/thunder/schedule",
  ],
};

export const EVENTS: OkcEvent[] = [
  // --- Hispanic Heritage Month & Latino culture ---
  e({
    id: "fiestas-de-las-americas",
    title: "Fiestas de las Américas",
    description:
      "Oklahoma City's largest Latino festival. The Parade of the Americas kicks things off, followed by a full day of family-friendly music, food, and culture along Calle Dos Cinco in Historic Capitol Hill.",
    category: "festival",
    start_date: "2026-10-03",
    end_date: "2026-10-03",
    hours_text: "Parade 11 a.m.–1 p.m. · Festival 10 a.m.–7 p.m.",
    venue: "Historic Capitol Hill (Calle Dos Cinco)",
    address: "2512 S Harvey Ave",
    lat: 35.4388,
    lng: -97.5188,
    price_text: "Free",
    is_free: true,
    url: "https://www.historiccapitolhill.com/fiestas-de-las-americas",
    highlights: [
      "Parade route: from Scissortail Park south on Robinson to Calle Dos Cinco",
      "Arrive before 11 a.m. to get a good spot along the parade route",
      "Questions: events@historiccapitolhill.com · 405-768-5465",
    ],
    tags: ["hispanic-heritage", "parade", "music"],
  }),
  e({
    id: "dale-dale-dale",
    title: "Dale Dale Dale: The Art of the Piñata",
    description:
      "An exhibition that treats the piñata as sculpture and explores its history and storytelling. It features handcrafted work by Mexican artists Mayra Reza and Rafael Salinas (Piñatas Aylin), from traditional forms to custom tornadoes, axolotls, vaqueros, and tacos.",
    category: "art",
    start_date: "2026-09-17",
    end_date: "2026-11-01",
    venue: "Norman Firehouse Art Center",
    address: "444 S Flood Ave",
    city: "Norman",
    lat: 35.2175,
    lng: -97.4527,
    url: "https://www.normanfirehouse.com/upcomingexhibitions",
    highlights: [
      'Pairs well with Sam Noble\'s "Lives of the Dead" for a one-day Norman trip',
      "Curated to spotlight underrepresented parts of Latino culture",
    ],
    tags: ["hispanic-heritage", "exhibition", "new"],
  }),
  e({
    id: "lives-of-the-dead",
    title:
      '"Lives of the Dead": The Day of the Dead in Mexican and Latin American Art',
    description:
      "More than 1,000 years of Mexican and Latin American art: ofrendas, sugar skulls, contemporary paintings, and antique prints.",
    category: "art",
    start_date: "2026-09-05",
    end_date: "2027-01-03",
    hours_text: "Tue–Sat 10 a.m.–5 p.m. · Sun 1–5 p.m. · Closed Mon",
    venue: "Sam Noble Museum",
    address: "2401 Chautauqua Ave",
    city: "Norman",
    lat: 35.1946,
    lng: -97.4481,
    price_text:
      "Included with admission: $12 adults, $10 seniors, $7 ages 4–17",
    url: "https://samnoblemuseum.ou.edu",
    highlights: [
      "Children 3 and under and OU students get in free",
      "Museum phone: 405-325-7977",
    ],
    tags: ["hispanic-heritage", "dia-de-los-muertos", "exhibition"],
  }),
  e({
    id: "festival-de-vida-y-muerte",
    title: "OKC Festival de Vida y Muerte",
    description:
      "Scissortail Park's Day of the Dead celebration, with traditional ofrendas (altars), live music, food, and artisan goods from more than 80 vendors.",
    category: "festival",
    start_date: "2026-11-01",
    end_date: "2026-11-01",
    hours_text: "Catrina Parade 5 p.m. · Catrina Contest 7 p.m.",
    ...SCISSORTAIL,
    url: "https://www.scissortailpark.org/events/okc-festival-de-vida-y-muerte-dia-de-muertos/",
    highlights: [
      "Catrina & alebrije (pet) parade: dress up the whole family",
      "Free kids' arts and crafts",
    ],
    tags: ["hispanic-heritage", "dia-de-los-muertos"],
  }),
  e({
    id: "scissortail-hispanic-festival",
    title: "Hispanic Fiesta at Scissortail Park",
    description:
      "A celebration of Hispanic cultures from many countries through music, dance, food, and a vendor showcase. The 2026 date hasn't been confirmed yet.",
    category: "festival",
    hours_text: "2026 date not yet confirmed",
    ...SCISSORTAIL,
    url: "https://www.scissortailpark.org/calendar/",
    highlights: [
      "Check the Scissortail Park calendar before planning around it",
    ],
    tags: ["hispanic-heritage"],
  }),

  // --- Fall festivals: September ---
  e({
    id: "oklahoma-state-fair",
    title: "Oklahoma State Fair",
    description:
      "Eleven days of rides, fair food, livestock, exhibits, and concerts at OKC Fair Park.",
    category: "festival",
    start_date: "2026-09-17",
    end_date: "2026-09-27",
    hours_text:
      "Buildings: Sun–Thu 10 a.m.–9 p.m., Fri–Sat 10 a.m.–10 p.m. · Carnival opens 1 p.m. weekdays, 11 a.m. weekends",
    venue: "OKC Fair Park",
    address: "3001 General Pershing Blvd",
    lat: 35.479,
    lng: -97.569,
    price_text: "Gate admission varies by day; kids 5 and under free",
    url: "https://okstatefair.com/information/hours-admissions/",
    highlights: [
      "Buy tickets online, at the Fair Park box office, by phone (405-948-6800), or at metro OnCue stores",
      "Final weekend: the fair ends Sunday, Sept. 27",
    ],
    tags: ["fall", "family"],
  }),
  e({
    id: "route-66-balloon-festival",
    title: "Centennial Route 66 Balloon Festival",
    description:
      "A five-day Route 66 centennial celebration with more than a dozen hot air balloons, tethered balloon rides, helicopter rides, kite shows, an art walk, live music, food trucks, and a vendor market.",
    category: "festival",
    start_date: "2026-09-23",
    end_date: "2026-09-27",
    venue: "Parkhurst Ranch",
    address: "14816 E 2nd St",
    city: "Arcadia",
    lat: 35.6545,
    lng: -97.3385,
    highlights: [
      "Officially recognized by the Oklahoma Route 66 Centennial Commission",
      "Balloon flights depend on wind and weather, so check before you go",
    ],
    tags: ["fall", "family"],
  }),
  e({
    id: "plaza-district-festival",
    title: "27th Annual Plaza District Festival",
    description:
      "One of OKC's biggest arts festivals, drawing 30,000+ people. Live music, 40+ local artist vendors, about 10 food trucks, and the 11th annual Plaza Walls Mural Expo along NW 16th Street.",
    category: "festival",
    start_date: "2026-09-26",
    end_date: "2026-09-26",
    hours_text: "Noon–11 p.m. · Headliner Bella Burns at 10 p.m.",
    venue: "Plaza District",
    address: "1700 NW 16th St",
    lat: 35.4866,
    lng: -97.5452,
    price_text: "Free",
    is_free: true,
    url: "https://plazadistrict.org/plaza-fest",
    highlights: [
      "Family Zone: art activities, face painting, balloon animals, and street dance",
      "60+ local businesses take part",
    ],
    tags: ["fall", "music", "art"],
  }),
  e({
    id: "mesta-festa",
    title: "31st Annual Mesta Festa",
    description:
      "A neighborhood festival in Perle Mesta Park with live music, a beverage garden, sand volleyball, kubb and bocce, food trucks, snow cones, local artists, and pop-up shops.",
    category: "festival",
    start_date: "2026-09-27",
    end_date: "2026-09-27",
    hours_text: "Noon–6 p.m.",
    venue: "Perle Mesta Park",
    address: "1900 N Shartel Ave",
    lat: 35.489,
    lng: -97.5265,
    price_text: "Free (beverage garden wristband $25)",
    is_free: true,
    url: "https://mestapark.org/mesta-festa/",
    highlights: [
      "Kid-friendly, with a dedicated kids' activity area and crafts",
    ],
    tags: ["fall", "family", "music", "new"],
  }),

  // --- October ---
  e({
    id: "pumpkinville",
    title: "Pumpkinville: Road to Route 66",
    description:
      "Thousands of pumpkins, seasonal displays, family activities, and giant pumpkin murals inspired by Route 66 landmarks.",
    category: "family",
    start_date: "2026-10-01",
    end_date: "2026-10-25",
    hours_text:
      "Thu, Sun & Mon 10 a.m.–5 p.m. · Fri–Sat 10 a.m.–8 p.m. · Closed Tue–Wed",
    venue: "Myriad Botanical Gardens",
    address: "301 W Reno Ave",
    lat: 35.4655,
    lng: -97.5165,
    price_text: "$15 online / $16 at the gate (ages 3+)",
    url: "https://myriadgardens.org/visit-us/seasonal/pumpkinville/",
    highlights: [
      "All-inclusive pass also covers the Crystal Bridge Conservatory and unlimited carousel rides",
      "Free for ages 2 and under and for Myriad Gardens members",
    ],
    tags: ["fall", "family", "pumpkins"],
  }),
  e({
    id: "asian-night-market",
    title: "Asian Night Market Festival",
    description:
      "One of Oklahoma's largest cultural festivals, with more than 100 vendors and experiences filling Classen Boulevard in OKC's Asian District.",
    category: "festival",
    start_date: "2026-10-02",
    end_date: "2026-10-03",
    venue: "Military Park & Classen Blvd (NW 23rd–27th)",
    address: "2520 N Classen Blvd",
    lat: 35.4968,
    lng: -97.5305,
    price_text: "Free",
    is_free: true,
    url: "https://www.asiandistrictok.com/anmf",
    tags: ["fall", "food"],
  }),
  e({
    id: "greek-fest-okc",
    title: "40th Annual Greek Festival",
    description:
      "Live music and dancing, Greek food and homemade pastries, a Greek market, and shopping boutiques.",
    category: "festival",
    start_date: "2026-10-02",
    end_date: "2026-10-04",
    hours_text: "Fri–Sat 10 a.m.–10 p.m. · Sun 11 a.m.–4 p.m.",
    venue: "St. George Greek Orthodox Church",
    address: "2101 NW 145th St",
    lat: 35.6215,
    lng: -97.5445,
    url: "https://www.greekfestokc.com/",
    highlights: ["Tickets and info: greekfestokc.com · 405-820-2942"],
    tags: ["fall", "food"],
  }),
  e({
    id: "wings-fall-festival",
    title: "Wings Fall Festival & Pumpkin Patch",
    description:
      "Pumpkins, fall decor, hayrides, games, inflatables, and a petting zoo, supporting Wings, a special-needs community.",
    category: "family",
    start_date: "2026-10-02",
    end_date: "2026-10-18",
    hours_text: "Weekends only · Fri–Sat 10 a.m.–6 p.m. · Sun 1–6 p.m.",
    venue: "Wings (new location)",
    address: "1349 E Wilshire Blvd",
    lat: 35.5672,
    lng: -97.4895,
    price_text: "$8 · family 4-pack $28 · ages 2 and under free",
    url: "https://www.wingsok.org/festival",
    highlights: [
      "New location this year, so double-check the address before you drive",
      "Info: 405-242-4646",
    ],
    tags: ["fall", "family", "pumpkins"],
  }),
  e({
    id: "orr-family-farm",
    title: "Orr Family Farm Fall Festival",
    description:
      "A pumpkin patch plus 25+ attractions: hayrides, Cannon Blasters, Trick 'Orr' Treat, a lighted trail, and festival food.",
    category: "family",
    start_date: "2026-09-19",
    end_date: "2026-11-14",
    hours_text:
      "Select dates · Early-October weekends: Fri–Sat 10 a.m.–10 p.m., Sun 10 a.m.–6 p.m.",
    venue: "Orr Family Farm",
    address: "14400 S Western Ave",
    lat: 35.328,
    lng: -97.5304,
    url: "https://www.orrfamilyfarm.com/calendar",
    highlights: [
      "Admission is good for one entry on any date of the fall season",
      "Add-ons include pony rides, gemstone mining, and paintball (see orrfamilyfarm.com/pricing)",
    ],
    tags: ["fall", "family", "pumpkins"],
  }),
  e({
    id: "norman-downtown-fall-festival",
    title: "Downtown Norman Fall Festival",
    description:
      "Main Street turns into a Halloween block party with trick-or-treating, rides, inflatables, fire-engine lights, costume contests, and a live DJ.",
    category: "block_party",
    start_date: "2026-10-23",
    end_date: "2026-10-23",
    hours_text: "6–9 p.m.",
    venue: "Main Street, 100–300 blocks",
    address: "E Main St",
    city: "Norman",
    lat: 35.2208,
    lng: -97.4436,
    price_text: "Free",
    is_free: true,
    url: "https://www.visitnorman.com/events/annual-events/downtown-norman-fall-festival/",
    highlights: ["Main Street closes to cars during the event"],
    tags: ["fall", "family", "halloween"],
  }),
  e({
    id: "storybook-forest",
    title: "Storybook Forest",
    description:
      "A not-so-scary alternative to trick-or-treating. Kids walk a lit forest path collecting candy from storybook characters, then gather at the campfire for hot dogs, s'mores, hot chocolate, and read-alouds, plus a hayride and game area.",
    category: "family",
    start_date: "2026-10-23",
    end_date: "2026-10-30",
    hours_text: "5:30–8:30 p.m. nightly (come and go; arrive after 5:15)",
    venue: "Arcadia Lake – Spring Creek Park",
    address: "7200 E 15th St",
    city: "Edmond",
    lat: 35.638,
    lng: -97.386,
    price_text: "$15 per child, $5 per adult",
    url: "https://www.edmondok.gov/1599/Storybook-Forest",
    highlights: [
      "Buy tickets in advance: capped at 600 child tickets per night",
      "Bring your printed or digital confirmation; tickets are good only for the night listed",
      "Cash only on site; no pets or outside food",
      "2.5 miles east of I-35 on 15th Street",
    ],
    tags: ["fall", "family", "halloween", "new"],
  }),
  e({
    id: "okc-parks-halloween-harvest",
    title: "OKC Parks Halloween Harvest",
    description:
      "Free come-and-go Halloween parties at OKC community centers with trick-or-treating, games, face painting, crafts, and food. Activities vary by location.",
    category: "family",
    start_date: "2026-10-31",
    end_date: "2026-10-31",
    venue: "OKC community centers (several locations)",
    price_text: "Free",
    is_free: true,
    url: "https://www.okc.gov/departments/parks-recreation/halloween-happenings/-seldept-7",
    highlights: [
      "In past years it ran 5–8 p.m. at six community centers; check okc.gov for 2026 locations",
    ],
    tags: ["fall", "family", "halloween"],
  }),

  // --- November ---
  e({
    id: "turkey-shoot-moore",
    title: "Turkey Shoot Free Throw Contest",
    description:
      "Shoot 10 free throws. The top shooter in each age division wins a Thanksgiving turkey.",
    category: "family",
    start_date: "2026-11-13",
    end_date: "2026-11-13",
    hours_text: "6–8 p.m.",
    venue: "The Station Recreation Center",
    address: "700 S Broadway Ave",
    city: "Moore",
    lat: 35.3288,
    lng: -97.486,
    price_text: "Free (registration required)",
    is_free: true,
    url: "https://www.cityofmoore.com/upcoming-events/turkey-shoot-free-throw-contest",
    highlights: [
      "Online registration only; it opens Oct. 1",
      "One turkey per family",
    ],
    tags: ["family", "sports", "new"],
  }),

  // --- Art exhibitions ---
  e({
    id: "art-nouveau-okcmoa",
    title: "The Triumph of Nature: Art Nouveau from the Chrysler Museum of Art",
    description:
      "127 Art Nouveau works (paintings, prints, jewelry, and furniture) on loan from the Chrysler Museum of Art.",
    category: "art",
    start_date: "2026-10-31",
    end_date: "2027-01-22",
    venue: "Oklahoma City Museum of Art",
    address: "415 Couch Dr",
    lat: 35.469,
    lng: -97.521,
    url: "https://www.okcmoa.com/visit/events/the-triumph-of-nature/",
    highlights: ["Museum info: okcmoa.com · 405-236-3100"],
    tags: ["exhibition"],
  }),

  // --- Thunder home games (Paycom Center) ---
  // Partial list. Confirm dates and tip times at nba.com/thunder/schedule.
  e({
    id: "thunder-2026-10-22-den",
    title: "Thunder vs. Denver Nuggets: Home Opener",
    category: "sports",
    start_date: "2026-10-22",
    end_date: "2026-10-22",
    hours_text: "8:30 p.m. tip",
    ...PAYCOM,
    tags: ["thunder", "basketball"],
  }),
  e({
    id: "thunder-2026-10-25-lac",
    title: "Thunder vs. LA Clippers",
    category: "sports",
    start_date: "2026-10-25",
    end_date: "2026-10-25",
    hours_text: "Check tip time",
    ...PAYCOM,
    tags: ["thunder", "basketball"],
  }),
  e({
    id: "thunder-2026-10-26-phx",
    title: "Thunder vs. Phoenix Suns",
    category: "sports",
    start_date: "2026-10-26",
    end_date: "2026-10-26",
    hours_text: "Check tip time",
    ...PAYCOM,
    tags: ["thunder", "basketball"],
  }),
  e({
    id: "thunder-2026-11-18-atl",
    title: "Thunder vs. Atlanta Hawks",
    category: "sports",
    start_date: "2026-11-18",
    end_date: "2026-11-18",
    hours_text: "Check tip time",
    ...PAYCOM,
    tags: ["thunder", "basketball"],
  }),
  e({
    id: "thunder-2026-11-20-nop",
    title: "Thunder vs. New Orleans Pelicans: NBA Cup",
    category: "sports",
    start_date: "2026-11-20",
    end_date: "2026-11-20",
    hours_text: "7 p.m. tip",
    ...PAYCOM,
    tags: ["thunder", "basketball", "nba-cup"],
  }),
  e({
    id: "thunder-2026-11-25-min",
    title: "Thunder vs. Minnesota Timberwolves: NBA Cup",
    category: "sports",
    start_date: "2026-11-25",
    end_date: "2026-11-25",
    hours_text: "6:30 p.m. tip",
    ...PAYCOM,
    tags: ["thunder", "basketball", "nba-cup"],
  }),
];

export function getCuratedEvent(id: string) {
  return EVENTS.find((ev) => ev.id === id) ?? null;
}
