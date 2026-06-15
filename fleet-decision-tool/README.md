# Fleet Decision Tool

Decision-support web app for a mobile equipment fleet (loaders, haul trucks,
excavators, dozers, graders). Multi-brand: Caterpillar, Komatsu, John Deere,
Volvo, Hitachi, Terex, Case, Kawasaki — organized in cross-brand equivalence
classes.

> **Internal / centralized deployment.** This version stores all data in a
> shared PostgreSQL database with authentication, role-based access control
> (region/quarry scopes) and an audit log — built to run inside the corporate
> network via Docker. See **[DEPLOY.md](./DEPLOY.md)**,
> **[SECURITY.md](./SECURITY.md)** and **[PROPOSAL.md](./PROPOSAL.md)**.
> Quick start: `cp .env.example .env` → set `AUTH_SECRET` → `docker compose up -d --build`.

## Current scope (Phase 1)

- **Cost Calculator** (`/`): hourly operating cost (fuel + maintenance &
  service + operator) per model, across Low/Medium/High duty scenarios, with
  editable global parameters (diesel price, labor rates, benefits, service
  interval, weekly utilization, escalation vs the 2022 baseline, per-brand
  maintenance factors).
- **Compare Models** (`/compare`): stacked cost comparison of up to 5
  machines, including cross-brand within an equivalence class, with annualized
  totals.
- **Catalog & Equivalences** (`/catalog`): brand equivalence matrix per size
  class and loader↔truck pass-match tables.

## Data

Seeded from an OEM/dealer "Mobile Equipment O&O Costs — 2022 Base Year"
workbook (USD). Caterpillar reference models carry the published data;
equivalent models from other brands inherit class costs (marked "est")
until real fleet data is loaded. Parameters persist in `localStorage`.

## Roadmap

1. ~~Cost engine + multi-brand catalog~~ (this phase)
2. My Fleet: unit-level registry, age curves, multi-year replacement/overhaul
   CAPEX budget
3. Sites & Production: production-driven fleet sizing, current-vs-optimal
   fleet excess OPEX
4. Decision comparator: own vs rent vs contractor (NPV, payback, sensitivity)
5. Executive dashboard + Excel/PDF export

## Develop

```bash
npm install
npm run dev
```
