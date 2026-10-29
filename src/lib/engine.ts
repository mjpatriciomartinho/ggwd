import "server-only";
import { db } from "./db";
import type { EngineEvent, EngineStatus, Provider } from "./types";

// The engine log: every model call and web search is a row that starts as "running" and ends as done,
// error or skipped. The UI polls it to show which engine is working on what, right now.

type Row = Record<string, unknown>;

function toEvent(row: Row): EngineEvent {
  return {
    id: row.id as string,
    runId: (row.run_id as string) ?? null,
    provider: row.provider as Provider,
    model: row.model as string,
    label: row.label as string,
    task: row.task as string,
    reason: row.reason as string,
    status: row.status as EngineStatus,
    detail: row.detail as string,
    inputTokens: row.input_tokens as number,
    outputTokens: row.output_tokens as number,
    startedAt: row.started_at as number,
    endedAt: (row.ended_at as number) ?? null,
  };
}

export interface EventStart {
  runId: string | null;
  provider: Provider;
  model: string;
  label: string;
  task: string;
  reason: string;
}

export interface EventHandle {
  id: string;
  /** Live detail while running ("writing 12k characters"); throttled so streaming doesn't flood D1. */
  progress(detail: string): void;
  finish(status: EngineStatus, fields?: { detail?: string; inputTokens?: number; outputTokens?: number }): Promise<void>;
}

export async function startEvent(e: EventStart): Promise<EventHandle> {
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO events (id, run_id, provider, model, label, task, reason, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)`,
    )
    .bind(id, e.runId, e.provider, e.model, e.label, e.task, e.reason, Date.now())
    .run()
    .catch((err) => console.error("engine log", err));
  let last = 0;
  return {
    id,
    progress(detail) {
      if (Date.now() - last < 1000) return;
      last = Date.now();
      void db().prepare("UPDATE events SET detail = ? WHERE id = ? AND status = 'running'").bind(detail, id).run().catch(() => {});
    },
    async finish(status, fields = {}) {
      await db()
        .prepare("UPDATE events SET status = ?, detail = ?, input_tokens = ?, output_tokens = ?, ended_at = ? WHERE id = ?")
        .bind(status, fields.detail ?? "", fields.inputTokens ?? 0, fields.outputTokens ?? 0, Date.now(), id)
        .run()
        .catch((err) => console.error("engine log", err));
    },
  };
}

/**
 * Closes calls a run left open: when a Workflow step times out and retries, the call it was waiting on never
 * reports back, and would otherwise show as a busy engine forever.
 */
export async function closeRun(runId: string) {
  await db()
    .prepare("UPDATE events SET status = 'error', detail = 'interrupted (step retried)', ended_at = ? WHERE run_id = ? AND status = 'running'")
    .bind(Date.now(), runId)
    .run()
    .catch((err) => console.error("engine log", err));
}

export async function eventsFor(runId: string): Promise<EngineEvent[]> {
  const { results } = await db().prepare("SELECT * FROM events WHERE run_id = ? ORDER BY started_at").bind(runId).all<Row>();
  return results.map(toEvent);
}

export async function recentEvents(limit = 20): Promise<EngineEvent[]> {
  const { results } = await db().prepare("SELECT * FROM events ORDER BY started_at DESC LIMIT ?").bind(limit).all<Row>();
  return results.map(toEvent);
}

export async function engineTotals(since: number) {
  const { results } = await db()
    .prepare(
      `SELECT provider, label, COUNT(*) AS calls, SUM(input_tokens) AS input, SUM(output_tokens) AS output,
         SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running
       FROM events WHERE started_at > ? GROUP BY provider, label ORDER BY calls DESC`,
    )
    .bind(since)
    .all<Row>();
  return results.map((r) => ({
    provider: r.provider as Provider,
    label: r.label as string,
    calls: r.calls as number,
    inputTokens: (r.input as number) ?? 0,
    outputTokens: (r.output as number) ?? 0,
    running: (r.running as number) ?? 0,
  }));
}
