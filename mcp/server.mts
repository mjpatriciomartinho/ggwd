// ggwd MCP server (stdio). Lets Claude Code or any MCP client analyze a game's reviews, read reports
// and dig through the raw reviews, through the running ggwd app. Start the app first (`npm run dev`),
// then register this server (`claude mcp add ggwd -- npx tsx <path>/mcp/server.mts`).
// Set GGWD_URL if the app isn't on http://localhost:3100.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Analysis, AnalysisListItem, Job, Review, Source } from "../src/lib/types.js";

const BASE = process.env.GGWD_URL ?? "http://localhost:3100";
// On the public site, AI actions need the judge/access code (GGWD_CODE), sent as a header.
const CODE = process.env.GGWD_CODE ?? null;
// The deployed site is password-protected (HTTP Basic, any username) while it's private.
const AUTH = process.env.GGWD_PASSWORD ? `Basic ${Buffer.from(`mcp:${process.env.GGWD_PASSWORD}`).toString("base64")}` : null;

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(AUTH ? { Authorization: AUTH } : {}),
        ...(CODE ? { "x-ggwd-code": CODE } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`ggwd isn't running at ${BASE}. Start it with \`npm run dev\` in the ggwd folder.`);
  }
  const isJson = res.headers.get("content-type")?.includes("json");
  const data = (isJson ? await res.json() : await res.text()) as T & { error?: string };
  if (!res.ok) throw new Error((isJson && data.error) || `ggwd ${res.status} on ${path}`);
  return data;
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Accepts an analysis id, a source id ("steam-413150"), a Steam app id or a Steam URL. */
async function resolveAnalysisId(ref: string): Promise<number> {
  const trimmed = ref.trim();
  if (/^\d+$/.test(trimmed) && Number(trimmed) < 100000) return Number(trimmed);
  const appid = trimmed.match(/app\/(\d+)/)?.[1] ?? trimmed.match(/^steam-(\d+)$/)?.[1] ?? trimmed.match(/^(\d+)$/)?.[1];
  if (!appid) throw new Error(`Couldn't understand "${ref}". Pass an analysis id, steam-<appid>, an app id or a Steam URL.`);
  const { latestAnalysisId } = await call<{ latestAnalysisId: number | null }>(`/api/sources/steam-${appid}`);
  if (!latestAnalysisId) throw new Error(`steam-${appid} has no analysis yet. Run analyze_steam_game first.`);
  return latestAnalysisId;
}

const server = new McpServer({ name: "ggwd", version: "0.1.0" });

server.registerTool(
  "list_reports",
  {
    description: "List the games ggwd has already analyzed, newest first, with their latest analysis id and one-line summary.",
    inputSchema: {},
  },
  async () => {
    const { analyses } = await call<{ analyses: AnalysisListItem[] }>("/api/analyses");
    return text(
      analyses.map((a) => ({
        analysis_id: a.id,
        source_id: a.source.id,
        game: a.source.name,
        developer: a.source.developer,
        steam_positive_pct: a.source.totals?.total ? Math.round((a.source.totals.positive / a.source.totals.total) * 100) : null,
        sample_size: a.sampleSize,
        analyzed_at: new Date(a.createdAt).toISOString().slice(0, 10),
        summary: a.summary,
      })),
    );
  },
);

server.registerTool(
  "analyze_steam_game",
  {
    description:
      "Download the most helpful Steam reviews of a game (launch, mid-life and last 12 months; half recommended, half not) and " +
      "analyze them: what hooks players, what frustrates them, what they ask for, why they quit early. Takes 1-4 minutes and " +
      "costs a few cents in Nemotron usage on Nebius Token Factory, so check list_reports first. Returns the report as Markdown.",
    inputSchema: {
      url: z.string().describe("Steam store URL or app id"),
      per_side: z.number().int().min(50).max(500).optional().describe("Reviews per verdict (default 200, so 400 in total)"),
      review_language: z.string().optional().describe("Steam language code of the reviews: english (default), spanish, all…"),
      report_language: z.enum(["en", "es"]).optional().describe("Language of the report (default en)"),
    },
  },
  async ({ url, per_side, review_language, report_language }) => {
    let { job } = await call<{ job: Job }>("/api/analyses", {
      url,
      perSide: per_side ?? 200,
      language: review_language ?? "english",
      reportLanguage: report_language ?? "en",
    });
    const deadline = Date.now() + 9 * 60_000;
    while (job.status === "queued" || job.status === "running") {
      if (Date.now() > deadline) return text(`Still running (${job.stage}: ${job.detail}). Check list_reports in a minute.`);
      await sleep(3000);
      ({ job } = await call<{ job: Job }>(`/api/jobs/${job.id}`));
    }
    if (job.status === "error" || !job.analysisId) throw new Error(job.error ?? "The analysis failed.");
    const brief = await call<string>(`/api/analyses/${job.analysisId}/brief`);
    return text(`${brief}\n\n(analysis_id ${job.analysisId}, source_id ${job.sourceId}; web report: ${BASE}/report/${job.analysisId})`);
  },
);

server.registerTool(
  "get_report",
  {
    description:
      "Get a finished review report. markdown (default) is the readable brief with themes, counts, quotes and design lessons; " +
      "json is the full structure including the review ids behind every theme.",
    inputSchema: {
      game: z.string().describe("Analysis id, source id (steam-413150), Steam app id or Steam URL"),
      format: z.enum(["markdown", "json"]).optional(),
    },
  },
  async ({ game, format }) => {
    const id = await resolveAnalysisId(game);
    if (format === "json") {
      const { analysis, source } = await call<{ analysis: Analysis; source: Source }>(`/api/analyses/${id}`);
      return text({ source, eras: analysis.eras, options: analysis.options, report: analysis.report });
    }
    return text(await call<string>(`/api/analyses/${id}/brief`));
  },
);

server.registerTool(
  "search_reviews",
  {
    description:
      "Search the raw reviews ggwd downloaded for a game, most helpful first. Use it to check a hunch or read what players " +
      "say about one specific mechanic (e.g. query 'boss', sentiment negative, min_hours 50).",
    inputSchema: {
      game: z.string().describe("Source id (steam-413150), Steam app id or Steam URL"),
      query: z.string().optional().describe("Word or phrase the review must contain (case-insensitive)"),
      sentiment: z.enum(["positive", "negative"]).optional(),
      min_hours: z.number().optional().describe("Minimum hours played when the review was written"),
      max_hours: z.number().optional(),
      limit: z.number().int().min(1).max(100).optional().describe("Default 25"),
    },
  },
  async ({ game, query, sentiment, min_hours, max_hours, limit }) => {
    const appid = game.match(/app\/(\d+)/)?.[1] ?? game.match(/(\d+)/)?.[1];
    if (!appid) throw new Error(`Couldn't find a Steam app id in "${game}".`);
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sentiment) p.set("sentiment", sentiment);
    if (min_hours != null) p.set("minHours", String(min_hours));
    if (max_hours != null) p.set("maxHours", String(max_hours));
    p.set("limit", String(limit ?? 25));
    const { reviews } = await call<{ reviews: Review[] }>(`/api/sources/steam-${appid}/reviews?${p}`);
    return text(
      reviews.map((r) => ({
        recommended: r.positive,
        hours_at_review: r.hoursAtReview,
        helpful_votes: r.helpful,
        date: new Date(r.createdAt * 1000).toISOString().slice(0, 10),
        text: r.text,
      })),
    );
  },
);

await server.connect(new StdioServerTransport());
