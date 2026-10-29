@AGENTS.md

# ggwd (good game, well developed)

Web app that reads the most helpful Steam reviews of a game and turns them into a report for game developers:
what hooks players, what frustrates them, what they ask for, why they quit early, how opinion changed, design
lessons. Also suggests games to study from a description of your own game. Built to become a paid product,
not just an internal tool. README.md has the setup details; this file has the context and decisions.

## Status (2026-10-27)

- **Hackathon pivot** (NVIDIA x Nebius Global AI Hackathon, deadline Oct 30 2026 10:00 PT, devpost
  nebiusglobalaihackathon): all AI moved from Claude to NVIDIA Nemotron on Nebius Token Factory, Tavily added
  (there's a $3k "Best Use of Tavily" prize and $100 feedback prizes). Track: Best Apps and Agents. Needs a
  public repo with MIT license, demo URL, ≤3 min YouTube video, and the README feedback section filled in.
- Local preview without keys: `GGWD_MOCK=1` in `.env.local` (Steam real, model/search answers canned).
- **Judge access** (`src/lib/access.ts`): the public site is browsable, but `POST /api/analyses` and
  `POST /api/discover` need `JUDGE_CODE` (Worker secret), given as `?code=` on any page (stored in an httpOnly
  cookie by `/api/access`) or the `x-ggwd-code` header. No `JUDGE_CODE` = open, as in local dev.
- Code: private repo https://github.com/mjpatriciomartinho/ggwd (branch `main`); make it public to submit.

- Not deployed yet in María's own accounts, and no public repo yet (both needed for the hackathon). Any
  earlier deployment, database or repo belonged to a previous owner and must not be reused.
- No accounts or payments yet. "Free during the preview" everywhere; pricing is shown but nothing charges.
- Example reports (public showcase): Vampire Survivors and Balatro (`EXAMPLE_SOURCES` in `src/lib/site.ts`).

## Decisions already made (don't relitigate)

- **Name**: **ggwd** ("good game, well developed"), decided 2026-10-27; replaces the provisional "Murmur".
  Keep the logo (the tiny bars "chorus"). Name, contact and legal entity live only in `src/lib/site.ts`.
  Cloudflare resources are named `game-reviews` on purpose so they survive renames.
- **Language**: whole UI and site in English. Reports default to English; Spanish is an option.
- **Pricing**: credit packs, no subscription. 1 = $19, 3 = $49, 10 = $99 (featured), 30 = $219. Single and
  3-pack are priced close on purpose to push people to the 10-pack. Credits never expire. Game suggestions
  are free (cheap lead magnet). **No refunds** of unused packs: purchases are final (immediate access, waiver
  of withdrawal right). When payments are built, checkout needs an explicit "I want immediate access and waive
  my right of withdrawal" checkbox (EU). A failed report gives its credit back (not implemented yet).
- **Legal**: operator "MJ", Spain. No contact email yet (`contactEmail` empty in `site.ts`: the footer hides
  "Contact" and legal pages show a placeholder). Privacy/terms are drafts to be reviewed by a lawyer before launch.
- **Hosting**: Cloudflare Workers (the code depends on D1 and Workflows). Rejected EC2/Lightsail/Cloud Run.
- **Platforms**: Steam now. Only Steam, iOS App Store and Google Play have written reviews worth analyzing.
  Next would be iOS (official public RSS feed, ~500 reviews per country, sortable by most helpful, no
  playtime), then Google Play (no official API; unofficial scraper, against their terms). Epic, Roblox,
  PlayStation, Nintendo have no written reviews; Xbox has them but no API. Keep code platform-generic
  (`src/lib/platforms/`, `PlatformId`).
- Future product: tracking reviews of your own games, alerts and reply drafts, as a monthly subscription.
- Acquisition: almost nobody searches for this on Google (DataForSEO: "steam review analyzer" ~10/month), and
  there are cheap Apify scrapers; traffic must come from dev communities, not SEO.

## Architecture

- Next.js 16.4 (App Router) on Cloudflare Workers via OpenNext. `custom-worker.ts` is the Worker entry: it
  checks the password, then hands over to the OpenNext handler, and exports the Workflow class.
- **D1** database `game-reviews` (binding `DB`), schema in `migrations/`. `src/lib/db.ts` gets it from the
  Cloudflare context; the Workflow passes its own binding with `bindDb()`.
- **Workflow** `game-reviews-analysis` (`src/workflows/analysis.ts`): one step per pipeline phase,
  retried independently. In `next dev` there are no Workflows, so `src/lib/jobs.ts` runs the same
  phases inline. Progress lives in the `jobs` table; UI and MCP poll `/api/jobs/:id`.
- **AI** (`src/lib/llm.ts`): Nebius Token Factory (OpenAI-compatible, plain fetch, streaming, json_schema from
  zod). `src/lib/models.ts` holds the Nemotron 3 Nano/Super/Ultra roster and `route()`, which picks a model per
  task with a human-readable reason and a fallback chain. Model ids verified against `GET /v1/models` on
  2026-10-29 (Nano and Super 262k context, Ultra `nvidia/Nemotron-3-Ultra-550b-a55b` 1M); override with
  `NEBIUS_MODEL_*`. Real run, 100 reviews: Nano skim ~35 s per batch of 40, Ultra report ~40 s, ~52k tokens.
- **Engine log** (`src/lib/engine.ts`, `events` table): every model call and Tavily search is a row the UI polls
  (`/api/jobs/:id`, `/api/runs/:id`, `/api/engine`). The design brief: always show which model does what.
- **Analysis** (`src/lib/analyze.ts`): pipeline lookup → collect → scout (Tavily + Nano timeline) → skim (Nano,
  batches of 40, 4 in parallel) → synthesize (Ultra). Models cite reviews by number; all counts, shares and
  medians are computed by us, and quotes not found verbatim in their review are dropped.
- **Discovery** (`src/lib/discover.ts`): Nano writes search queries → Tavily → Super picks games; each is
  resolved with Steam's store search so only real games come back.
- **MCP server** `mcp/server.mts` (stdio) talks to the app over HTTP. Env: `GGWD_URL` (default
  localhost:3100), `GGWD_PASSWORD` for the deployed site.

## Steam gotchas (verified, cost a lot of trial and error)

- `/appreviews/{id}?json=1` now redirects to the store home. Use `/ajaxappreviews/{id}` (same JSON).
- `filter=all` sorts by helpfulness but `day_range` caps at 365. For older eras use
  `date_range_type=include` with `start_date`/`end_date`.
- Bounds must be whole UTC days, and a range that ends inside the last 365 days gets clipped to that year, so
  older eras must end before the "last 12 months" era starts (`planEras` in `src/lib/platforms/steam.ts`).
- Steam sometimes returns short pages mid-stream: only an empty page or a stuck cursor means the end.
- The unhashed `header.jpg` path fails for some apps; the store search capsule is kept as a fallback.
- Steam answers fine from Cloudflare's network (tested 15 rapid requests).
- We never store reviewer names, Steam IDs or profiles.

## Secrets (never on disk, never hardcoded)

- The code only reads env vars. Locally they come from María's SSM: `secrets run -- npm run dev` (see her
  `secrets` skill). The Nebius key is stored there as `NEBIUS_TOKEN_FACTORY`; `src/lib/llm.ts` reads
  `NEBIUS_API_KEY` first, then that name. `TAVILY_API_KEY` is stored under its own name.
- Cloudflare: Worker secrets `NEBIUS_API_KEY`, `TAVILY_API_KEY` and, optionally, `SITE_PASSWORD` (HTTP Basic
  on the whole site while it's set). `scripts/cf.sh` runs wrangler/OpenNext with `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` from SSM.
- `wrangler.jsonc` has a placeholder D1 `database_id`: replace it with the id from `wrangler d1 create game-reviews`.

## Commands

```bash
npm run dev               # localhost:3100 with a local D1 (.wrangler/); run `npm run db:migrate` first
npm run deploy            # build with OpenNext and deploy (uses scripts/cf.sh)
npm run db:migrate:remote # apply new migrations to the remote D1
npm run cf-typegen        # regenerate cloudflare-env.d.ts after editing wrangler.jsonc
```

- Every real analysis costs Nebius money (cents for 100 reviews): ask before running several.
- Mac `sqlite3` exports use `unistr()`, which D1 rejects; export with Python and plain quoting if you ever need
  to move data into D1.
- Next 16 typegen: `PageProps`, `LayoutProps` and `RouteContext` are globals generated by `next dev`/`next build`.
- Lint flags any function starting with `use` as a React hook (hence `bindDb`, not `useDb`).

## Design

Arcade night mode (dark only, cheeky copy): mint = recommended, hot red = not recommended, yellow = requests,
violet `--hot` for actions (`.btn-hot`), NVIDIA green `--nv` for Nemotron, cyan `--tv` for Tavily; tokens in
`src/app/globals.css`. Display Chakra Petch, pixel labels Silkscreen, body Instrument Sans. Nemotron calls are
drawn as steam locomotives with the model name, Tavily as a radar (`src/components/Engines.tsx`). The signature element is the "chorus" strip (`src/components/Chorus.tsx`): every sampled review is a
bar on a time axis, and opening a theme highlights its reviews. Avoid generic SaaS card grids.

## Next steps (not started)

1. Pick a domain for ggwd and attach it to the Worker.
2. Accounts and payments (credits, Stripe, failed-report refunds of credits, withdrawal-waiver checkbox).
3. iOS App Store as a second platform.
