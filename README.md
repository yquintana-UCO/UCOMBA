# UCOMBA: Job Scout Agent

An agent that finds open jobs at the companies a user chooses, shown in a
blue and gold page with an industry dropdown and a search bar.

- **Architecture plan:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Clickable prototype:** open [web/index.html](web/index.html) in a browser
- **Live jobs API:** [api/jobs.js](api/jobs.js) returns Oklahoma + US-remote jobs (The Muse, Remotive)
- **API key:** set the `UCOMBA` environment variable in Vercel (locally: copy `.env.example` to `.env`)
- **Tests:** `node --test tests/jobs.test.js`
