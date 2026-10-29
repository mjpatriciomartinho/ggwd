# ggwd · good game, well developed

**Steam reviews are brutal. Learn from them.**

ggwd reads the most helpful Steam reviews of any game, from launch to today, and turns them into a report for
game developers: what hooks players, what makes them ragequit, what they're begging for, why they quit early, how
opinion changed and which design lessons to take home. It also suggests which games to study from a description
of the game you're making.

Built for the **NVIDIA x Nebius Global AI Hackathon** · Track: **Best Apps and Agents** · License: MIT

## How it works

Every report is a pipeline of five steps. Each one is run by the engine that fits it, and every call is logged
live in the UI (a steam locomotive with the model's name on its nameplate for Nemotron, a radar for Tavily).

| Step | Engine | What it does |
| --- | --- | --- |
| Lookup | Steam store | Game details and overall score |
| Collect | Steam store | Up to 700 most-helpful reviews, balanced between recommended and not, across launch, middle years and the last 12 months |
| Scout | **Tavily Search** + **Nemotron 3 Nano** | 3 web searches (patch history, launch coverage, controversies); Nano turns the results into a dated timeline with a source URL per event |
| Skim | **Nemotron 3 Nano** | Reads every review in parallel batches of 40, notes each concrete point with a verbatim quote |
| Synthesize | **Nemotron 3 Ultra** (thinking on) | Weighs all notes at once and writes the report, tying shifts in opinion to the web timeline |

"Describe your game" runs a smaller agent: **Nano** restates the pitch and writes search queries → **Tavily**
searches the current market → **Nemotron 3 Super** picks 10-12 games with roles (benchmark, closest match,
cautionary tale, same audience) → every pick is verified against the Steam store.

Numbers are never the model's guess: models cite reviews by number and we compute every count, share and median.
Quotes that don't appear verbatim in their review are dropped.

### The model router

`src/lib/models.ts` picks a model per task, with a reason the UI shows next to every call (see `/engine`):

- many small parallel reads (skim, timeline, query planning) → **Nemotron 3 Nano**: speed and price
- someone waiting for an answer (game suggestions) → **Nemotron 3 Super**
- the one call that weighs hundreds of reviews → **Nemotron 3 Ultra** with thinking on
- input that doesn't fit Ultra's 128k window → **Super**'s 1M context
- if a model fails, the next one in its fallback chain takes over (logged as such)

Model ids are resolved against Token Factory's `GET /v1/models`, so a renamed id still matches by family.

### Always visible

- Header HUD: Nebius and Tavily status (online / mock / offline) and the model running right now.
- Analysis: a progress bar per pipeline step, the locomotives at work and a terminal-style engine log with
  tokens, timing and the router's reason for each call.
- Report: the web timeline as flags on the review strip, a "Meanwhile, outside Steam" section with sources, and a
  "Built by" strip with each model's calls and tokens.
- `/engine`: the roster, the routing table and the live log of every call.

## Nebius, NVIDIA and Tavily usage

- **Nebius Token Factory** (`src/lib/llm.ts`): OpenAI-compatible `chat/completions` over plain `fetch` (it runs on
  Cloudflare Workers), streaming for live progress, `json_schema` structured output generated from zod schemas,
  `chat_template_kwargs.enable_thinking` per task, reasoning read from `message.reasoning`.
- **NVIDIA Nemotron 3 Nano, Super and Ultra** (`src/lib/models.ts`, `src/lib/analyze.ts`, `src/lib/discover.ts`).
- **Tavily** (`src/lib/tavily.ts`): runtime `POST /search` calls in every report (3 per game) and every game
  suggestion run (2-3), logged and shown live.

## Public demo and judge access

The demo is public, but running new reports or game suggestions spends real AI credits, so those two actions
need an access code. Judges: open any page of the demo with `?code=<your code>` (the full link is in the
submission's testing instructions). The code is stored in a cookie for 30 days and the page shows
"Judge mode: AI unlocked". Example reports, the engine room and everything else are open to anyone.

The code is the `JUDGE_CODE` secret; without it set (local dev), everything is open. The MCP server sends it as
the `x-ggwd-code` header when `GGWD_CODE` is set.

## Run it locally

```bash
npm install
cp .env.example .env.local   # add NEBIUS_API_KEY and TAVILY_API_KEY (or GGWD_MOCK=1 to preview without keys)
npm run db:migrate           # local D1 schema (.wrangler/)
npm run dev                  # http://localhost:3100
```

In mock mode the Steam data is real and the pipeline, progress and logs behave the same, but model and search
answers are canned (reports say "[Mock]").

## Deploy (Cloudflare)

Next.js 16 on Cloudflare Workers via OpenNext, D1 for data, a Cloudflare Workflow per report (each pipeline step
retries on its own).

```bash
npx wrangler secret put NEBIUS_API_KEY
npx wrangler secret put TAVILY_API_KEY
npm run db:migrate:remote
npm run deploy
```

## API and MCP

| Route | Purpose |
| --- | --- |
| `POST /api/analyses` | `{ url, perSide, language, reportLanguage }` → starts a report, returns the job |
| `GET /api/jobs/:id` | Job progress plus its engine events |
| `POST /api/discover` | `{ description, runId }` → games to study |
| `GET /api/runs/:runId` | Engine events of a suggestion run |
| `GET /api/engine` | Engine status, recent calls, 24h totals |
| `GET /api/analyses/:id/brief` | The report as Markdown for your own AI |

`mcp/server.mts` is an MCP server so coding agents can run reports and search reviews (`npm run mcp`).

## What changed during the hackathon

ggwd (first called Murmur) started, after the submission period opened, as a single-call app on a proprietary model. During the
hackathon it was rebuilt around open models:

- all inference moved to **NVIDIA Nemotron on Nebius Token Factory**, with a task-based router and fallbacks;
- the single analysis call became a multi-model pipeline (Nano skims in parallel, Ultra synthesizes);
- **Tavily** added for web context (timeline of updates and controversies) and market search for suggestions;
- engine telemetry (`events` table) and the live UI: per-step progress bars, steam-engine sprites, engine log, `/engine`;
- new arcade visual design.

## Feedback

_To fill in after testing with real keys: Token Factory (structured output per model, streaming, reasoning
field), Nemotron 3 Nano/Super/Ultra quality and latency, Tavily._
