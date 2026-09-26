-- PLACEHOLDER rows so the UI has something to show.
-- Venues are real OKC places, but these events and dates are NOT confirmed.
-- Replace with verified listings before launch.
insert into public.events (title, description, category, starts_at, ends_at, venue, address, city, lat, lng, price_text, is_free, tags) values
('[Sample] Fiestas de las Américas', 'Parade, lowrider show, and live music celebrating Latin American heritage.', 'festival', '2026-10-03 10:00-05', '2026-10-03 18:00-05', 'Historic Capitol Hill', 'SW 25th St & S Robinson Ave', 'Oklahoma City', 35.4390, -97.5165, 'Free', true, '{hispanic-heritage,parade,music}'),
('[Sample] Latino Art Walk', 'Gallery night featuring Latino and Latina artists across the district.', 'art', '2026-10-09 18:00-05', '2026-10-09 21:00-05', 'Plaza District', '1700 NW 16th St', 'Oklahoma City', 35.4890, -97.5460, 'Free', true, '{hispanic-heritage,gallery}'),
('[Sample] Noche de Salsa en el Parque', 'Beginner salsa lesson followed by a live band.', 'dance', '2026-10-10 19:00-05', '2026-10-10 22:00-05', 'Scissortail Park', '300 SW 7th St', 'Oklahoma City', 35.4610, -97.5190, '$10', false, '{salsa,live-music}'),
('[Sample] Mercado de Otoño', 'Fall market with local vendors, pan dulce, and crafts.', 'market', '2026-10-11 09:00-05', '2026-10-11 14:00-05', 'Calle Dos Cinco', 'SW 25th St', 'Oklahoma City', 35.4392, -97.5230, 'Free', true, '{food,shopping,family}'),
('[Sample] Día de los Muertos Block Party', 'Ofrendas, face painting, and mariachi.', 'block_party', '2026-11-01 16:00-05', '2026-11-01 21:00-05', 'Automobile Alley', 'N Broadway Ave & NW 9th St', 'Oklahoma City', 35.4770, -97.5130, 'Free', true, '{dia-de-los-muertos,family,music}'),
('[Sample] Taco Crawl Norman', 'Self-guided taco tour through Campus Corner.', 'food', '2026-10-17 12:00-05', '2026-10-17 17:00-05', 'Campus Corner', 'W Boyd St & S Asp Ave', 'Norman', 35.2090, -97.4440, '$25', false, '{food}');
