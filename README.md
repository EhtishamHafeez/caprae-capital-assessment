# LeadPilot

An enhancement built on top of the [SaaSquatch Leads](https://www.saasquatchleads.com/) concept for the Caprae Capital Full Stack Developer pre-work challenge — a lead-generation dashboard that adds **transparent ICP-fit scoring** and **AI-drafted personalized outreach** on top of the core scrape → enrich → save → export workflow.

## The problem this solves

SaaSquatch (and tools like it) are very good at the *volume* side of lead gen: scrape a lot of company data, enrich it, dump it in a dashboard. The bottleneck for a sales team (or a search-fund/PE deal team doing acquisition sourcing — which is literally how Caprae uses its own SaaSquatch tool internally) isn't finding leads, it's **knowing which of the 300 leads in front of you to work first, and getting a first-touch message out the door quickly**.

This project picked **one feature area and went deep on it** (the "Quality First" path in the handbook) rather than shipping several shallow tools:

1. **ICP-Fit Scoring Engine** — every lead gets a transparent 0–100 score against a target profile you define (industry, revenue range, employee range), broken into 6 explainable sub-scores (industry match, revenue fit, headcount fit, data completeness, growth signals, company maturity). Sales reps can see *why* a lead scored the way it did, not just a black-box number.
2. **AI-Drafted Outreach** — one click generates a short, specific, non-generic cold email for any lead, grounded in that company's actual profile and growth signals, using Claude (Anthropic API). Falls back to a solid deterministic template if no API key is configured, so the feature always works.

Everything else (search, filter, save-to-pipeline, CSV export) is the baseline needed to make those two features useful in a real workflow.

## Why this aligns with the business

- **Prioritization over volume**: scoring surfaces the leads worth a rep's time first, instead of a flat list of hundreds of rows.
- **Time-to-first-touch**: outreach drafting collapses "research the company → write a personalized opener" from ~10 minutes to one click.
- **Explainability**: the score breakdown is a deliberate choice — a sales team (or a deal team) needs to trust and defend prioritization decisions, so the scoring is a readable rules engine, not an opaque model.
- **Dual use case**: the same ICP-matching engine that ranks leads for outbound sales works unchanged as an acquisition-target screener (industry / revenue / headcount fit is exactly the first-pass filter a search fund uses on deal flow), which maps directly to how Caprae uses its own sourcing tool.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, TypeScript) | Single deployable app for both the UI and the API — no separate backend service to stand up or CORS to manage. |
| UI | React + Tailwind CSS | Fast to build a clean, information-dense dashboard without a component library dependency. |
| Data fetching | SWR | Handles request de-duping, caching, and loading/revalidation state on the client without hand-rolled `useEffect` fetch logic. |
| Database | SQLite (`better-sqlite3`), file-based | Zero external services for a reviewer to spin up — `npm install && npm run dev` just works. Synchronous driver keeps API route code simple. See **Data storage** below for the production path. |
| Caching | In-memory LRU (`lru-cache`) | Two caches: a short-TTL (60s) query cache for filtered lead searches, and a long-TTL (24h) cache for generated outreach emails (avoids re-paying for an LLM call on the same lead+sender). |
| AI | Anthropic API (`@anthropic-ai/sdk`), `claude-sonnet-4-5` | Used specifically for outreach *copywriting*, where a generative model adds real value. Lead scoring stays rule-based and explainable — see **Design decisions**. |
| Validation | Zod | Request body validation on the outreach-generation route. |

### Data storage

SQLite is the right choice for this deployment (a single-process demo/review app with a ~300-row table), but it is a filesystem-backed database, which doesn't survive across serverless function instances. The repository layer (`src/lib/leads-repo.ts`, `src/lib/db.ts`) is the only place that talks to the database, so moving to production means:

- Swap `better-sqlite3` for a serverless-friendly Postgres driver (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com), both have generous free tiers and HTTP-based drivers that work from edge/serverless functions).
- Keep the same query shapes — the `queryLeads` / `getLeadById` / `toggleSaved` function signatures don't need to change, only their implementation.
- Add a `pg`-based migration for the two tables in `db.ts`'s `seed()` function.

### Caching

The in-memory LRU cache works because this runs as one long-lived Node process. On serverless (Vercel functions, AWS Lambda), each cold-started instance has its own memory, so the cache hit rate would collapse. Production fix: swap `src/lib/cache.ts` for [Upstash Redis](https://upstash.com) (HTTP-based, serverless-friendly, has a free tier) behind the same `cachedQuery` / `getCachedOutreach` / `setCachedOutreach` interface — call sites don't change.

### Hosting & deployment

Designed to deploy as:
- **Frontend**: static/edge-rendered by Next.js on Vercel's CDN (the dashboard itself has no server-only data at build time).
- **Backend**: the `src/app/api/*` routes deploy as serverless functions automatically on Vercel — no separate backend to provision.
- **Cloud provider**: Vercel (built on AWS under the hood) for the fastest path to a working deployment; the app also ships with a standard `next build` output so it runs identically in a Docker container on AWS (App Runner/ECS), GCP Cloud Run, or Azure Container Apps if a specific cloud is required — only the database/cache drivers noted above would need to point at that provider's managed Postgres/Redis instead of Neon/Upstash.

No live cloud deployment or third-party accounts (Vercel/Neon/Upstash) were created for this submission — the app runs fully locally per the setup instructions below, and the video walkthrough demonstrates it running.

## Design decisions

- **Scoring is a rules engine, not an LLM call.** Numeric prioritization needs to be fast, cheap (no API cost per lead in a list of hundreds), deterministic, and defensible to a sales manager who asks "why is this lead ranked #3?". An LLM is the wrong tool for that; it's the right tool for writing prose, which is where it's actually used.
- **AI features degrade gracefully.** No `ANTHROPIC_API_KEY` set? Outreach generation still works via a template — the app never hard-fails because a key is missing.
- **Synthetic dataset, disclosed.** `data/leads.csv` (320 rows) is generated by `scripts/generate-dataset.mjs` — it's synthetic (no real companies, no real PII), seeded deterministically, shaped to look like real scraped output (industry, location, revenue estimate, employee count, growth signals, contact info) so the scoring/filtering/export pipeline has something realistic to operate on without scraping live sites or depending on a paid enrichment API key for the submission to run.

## Getting started

**Requirements**: Node.js 20+.

```bash
git clone https://github.com/EhtishamHafeez/caprae-capital-assessment.git
cd caprae-capital-assessment
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is created and seeded automatically from `data/leads.csv` on first run — no manual setup step.

Optional — enable real AI-generated outreach emails (otherwise a template fallback is used):

```bash
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
```

### Regenerating the dataset

```bash
node scripts/generate-dataset.mjs
```

This overwrites `data/leads.csv`. Delete `data/app.db` afterward to force a re-seed on next `npm run dev`.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Testing

42 tests (Vitest) covering the logic that's actually risky to get wrong:

- **`scoring.test.ts`** — every component of the ICP-fit scoring engine (industry/revenue/employee fit, data completeness, growth-signal capping, maturity, tier boundaries, the human-readable rationale), including a couple of "obviously right" cases (perfect match → 100/Hot) and a couple of edge cases (no ICP set → neutral credit, zero-data lead → Cold).
- **`ai.test.ts`** — the outreach template fallback (used whenever `ANTHROPIC_API_KEY` isn't set), including a regression test for a grammar bug caught during manual testing ("has been press mention recently").
- **`parse-filters.test.ts`** — query-string parsing (comma lists, numeric coercion, trailing commas).
- **`format.test.ts`** — currency/number display formatting.
- **`leads-repo.test.ts`** — integration tests against the real seeded SQLite database: filtering, full-text search, pagination boundaries, sorting, and the save/unsave round trip (with cleanup so tests don't leave state behind).

Not covered: the real Claude API call path in `ai.ts` (would need a live key or a mocked HTTP layer — the deterministic fallback it degrades to is what's tested) and the API route handlers themselves (thin wrappers over the tested `leads-repo`/`scoring`/`ai` functions, verified manually against a running server instead — see the video walkthrough).

## Project structure

```
src/
  app/
    page.tsx              # Dashboard UI (client component)
    api/
      leads/route.ts       # GET — search/filter/score/paginate leads
      leads/export/route.ts# GET — CSV export (filtered view or saved-only)
      leads/saved/route.ts # GET — list saved leads
      leads/[id]/save/route.ts     # POST — toggle save
      leads/[id]/outreach/route.ts # POST — generate AI outreach email
      meta/route.ts        # GET — filter dropdown options
  components/               # FilterPanel, LeadsTable, LeadDrawer, ScoreBadge
  lib/
    db.ts                  # SQLite connection + schema + CSV seed
    leads-repo.ts           # Query layer (the only module that touches the DB)
    scoring.ts              # ICP-fit scoring engine
    ai.ts                   # Claude-powered outreach generation + fallback
    cache.ts                # In-memory query/outreach caches
data/
  leads.csv                # Synthetic seed dataset (320 companies)
scripts/
  generate-dataset.mjs      # Deterministic dataset generator
```

## Ethical data note

All lead data in this repository is synthetically generated for demonstration purposes — no real companies, individuals, emails, or phone numbers are included. A production version would source real data via permissioned APIs/scraping with appropriate rate-limiting, robots.txt compliance, and a documented opt-out process for contacted businesses.
