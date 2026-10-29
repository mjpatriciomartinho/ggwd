import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db, bindDb } from "./db";
import { emptyLedger, scoutWeb, skimReviews, synthesize, type Ledger, type Notes, type Scouted } from "./analyze";
import { collectReviews, fetchSource, parseSteamUrl } from "./platforms/steam";
import { getReviews, getSource, saveAnalysis, saveReviews, saveSource } from "./store";
import type { Era, Job, JobStatus, PipelineStep, SampleOptions, Source } from "./types";

// Analyses take a few minutes. In production each one is a Cloudflare Workflow (src/workflows/analysis.ts)
// whose steps are the phases below, so a failed step retries on its own and nothing is lost if a request
// ends. `next dev` has no Workflows, so there the same phases simply run in the background of the server.
// Progress lives in the jobs table either way, and the UI and the MCP server poll it.

export class InputError extends Error {}

type Row = Record<string, unknown>;

export interface AnalysisParams {
  jobId: string;
  appid: string;
  options: SampleOptions;
}

export interface Collected {
  reviewIds: string[];
  eraOf: Record<string, string>;
  eras: Era[];
}

function toJob(row: Row): Job {
  return {
    id: row.id as string,
    sourceId: (row.source_id as string) ?? null,
    url: row.url as string,
    status: row.status as JobStatus,
    step: ((row.step as string) ?? "") as PipelineStep | "",
    stage: row.stage as string,
    detail: row.detail as string,
    done: row.done as number,
    total: row.total as number,
    error: (row.error as string) ?? null,
    analysisId: (row.analysis_id as number) ?? null,
    createdAt: row.created_at as number,
  };
}

export async function getJob(id: string): Promise<Job | null> {
  const row = await db().prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first<Row>();
  return row ? toJob(row) : null;
}

type JobFields = Partial<Record<"status" | "step" | "stage" | "detail" | "done" | "total" | "error" | "analysis_id", string | number | null>>;

export async function updateJob(id: string, fields: JobFields) {
  const keys = Object.keys(fields) as (keyof JobFields)[];
  await db()
    .prepare(`UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...keys.map((k) => fields[k] ?? null), Date.now(), id)
    .run();
}

/** Progress arrives with every page of reviews; writing each update to the database would be wasteful. */
function throttled(id: string) {
  let last = 0;
  return (fields: JobFields) => {
    if (Date.now() - last < 1200) return;
    last = Date.now();
    void updateJob(id, fields).catch(() => {});
  };
}

export async function startAnalysis(url: string, options: SampleOptions): Promise<Job> {
  const appid = parseSteamUrl(url);
  if (!appid) throw new InputError("Paste a Steam store link, like store.steampowered.com/app/413150/Stardew_Valley.");
  const sourceId = `steam-${appid}`;

  const running = await db()
    .prepare("SELECT * FROM jobs WHERE source_id = ? AND status IN ('queued', 'running') AND updated_at > ?")
    .bind(sourceId, Date.now() - 10 * 60_000)
    .first<Row>();
  if (running) return toJob(running);

  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO jobs (id, source_id, url, status, stage, created_at, updated_at) VALUES (?, ?, ?, 'queued', 'Starting', ?, ?)")
    .bind(id, sourceId, url, Date.now(), Date.now())
    .run();

  const params: AnalysisParams = { jobId: id, appid, options };
  const workflow = process.env.NODE_ENV === "production" ? getCloudflareContext().env.ANALYSIS_WORKFLOW : undefined;
  if (workflow) await workflow.create({ id, params });
  else {
    // The inline run outlives this request, so pin the database instead of looking it up later.
    bindDb(db());
    void runInline(params);
  }
  return (await getJob(id))!;
}

async function runInline(params: AnalysisParams) {
  try {
    const source = await lookupPhase(params);
    const collected = await collectPhase(params, source);
    const scouted = await scoutPhase(params, source);
    const skimmed = await skimPhase(params, source, collected);
    await synthesizePhase(params, source, collected, scouted, skimmed);
  } catch (err) {
    console.error(err);
    await failJob(params.jobId, err);
  }
}

export async function failJob(jobId: string, err: unknown) {
  await updateJob(jobId, { status: "error", error: err instanceof Error ? err.message : "Unexpected error" });
}

/* --------------------------------- Phases --------------------------------- */

export async function lookupPhase({ jobId, appid }: AnalysisParams): Promise<Source> {
  await updateJob(jobId, { status: "running", step: "lookup", stage: "Looking up the game on Steam" });
  const source = await fetchSource(appid);
  await saveSource(source);
  await updateJob(jobId, { detail: source.name });
  return source;
}

export async function collectPhase({ jobId, options }: AnalysisParams, source: Source): Promise<Collected> {
  await updateJob(jobId, { step: "collect" });
  const progress = throttled(jobId);
  const { reviews, eraOf, eras } = await collectReviews(source, options, (p) =>
    progress({ stage: p.stage, detail: p.detail, done: p.done, total: p.total }),
  );
  await saveReviews(reviews);
  await updateJob(jobId, { stage: "Reviews collected", detail: `${reviews.length} reviews`, done: reviews.length, total: reviews.length });
  return { reviewIds: reviews.map((r) => r.reviewId), eraOf: Object.fromEntries(eraOf), eras };
}

export async function scoutPhase({ jobId, options }: AnalysisParams, source: Source): Promise<Scouted> {
  await updateJob(jobId, { step: "scout", stage: "Scouting the web with Tavily", detail: "Updates, launches, controversies", done: 0, total: 0 });
  // The web timeline is a bonus: if search or the digest fails, the report goes ahead without it.
  return scoutWeb(jobId, source, options).catch((err) => {
    console.error("scout", err);
    return { outside: null, ledger: emptyLedger() };
  });
}

export interface Skimmed {
  notes: Notes;
  ledger: Ledger;
}

export async function skimPhase({ jobId }: AnalysisParams, source: Source, collected: Collected): Promise<Skimmed> {
  await updateJob(jobId, { step: "skim", stage: "Skimming every review", detail: "Nemotron Nano reads in parallel batches", done: 0, total: 0 });
  const reviews = await getReviews(source.id, collected.reviewIds);
  return skimReviews(jobId, reviews, (done, total) =>
    void updateJob(jobId, { done, total, detail: `${done} of ${total} batches read` }).catch(() => {}),
  );
}

export async function synthesizePhase(
  { jobId, options }: AnalysisParams,
  source: Source,
  collected: Collected,
  scouted: Scouted,
  skimmed: Skimmed,
): Promise<number> {
  await updateJob(jobId, { step: "synthesize", stage: "Writing the report", detail: "Weighing every note at once", done: 0, total: 0 });
  const reviews = await getReviews(source.id, collected.reviewIds);
  const { report, sample, ledger } = await synthesize({
    runId: jobId,
    source: (await getSource(source.id)) ?? source,
    reviews,
    notes: skimmed.notes,
    eraOf: new Map(Object.entries(collected.eraOf)),
    eras: collected.eras,
    outside: scouted.outside,
    options,
  });
  const usage = mergeLedgers(scouted.ledger, skimmed.ledger, ledger);
  const analysisId = await saveAnalysis({
    sourceId: source.id,
    createdAt: Date.now(),
    options,
    eras: collected.eras,
    sample,
    report,
    model: usage.byModel!.map((m) => m.label).join(" + "),
    usage,
  });
  await updateJob(jobId, { status: "done", step: "", stage: "Done", detail: "", analysis_id: analysisId });
  return analysisId;
}

function mergeLedgers(...ledgers: Ledger[]): Ledger {
  const out = emptyLedger();
  for (const l of ledgers) {
    out.inputTokens += l.inputTokens;
    out.outputTokens += l.outputTokens;
    out.searches! += l.searches ?? 0;
    for (const m of l.byModel ?? []) {
      const row = out.byModel!.find((x) => x.model === m.model);
      if (!row) out.byModel!.push({ ...m, tasks: [...m.tasks] });
      else {
        row.calls += m.calls;
        row.inputTokens += m.inputTokens;
        row.outputTokens += m.outputTokens;
        for (const t of m.tasks) if (!row.tasks.includes(t)) row.tasks.push(t);
      }
    }
  }
  return out;
}
