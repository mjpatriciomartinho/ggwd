import "server-only";
import { db } from "./db";
import type { Analysis, AnalysisListItem, Era, Report, Review, SampleOptions, SampleReview, Source } from "./types";

type Row = Record<string, unknown>;

/* --------------------------------- Sources --------------------------------- */

export async function saveSource(source: Source) {
  await db()
    .prepare(
      `INSERT INTO sources (id, platform, external_id, data, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
    .bind(source.id, source.platform, source.externalId, JSON.stringify(source), source.updatedAt)
    .run();
}

export async function getSource(id: string): Promise<Source | null> {
  const row = await db().prepare("SELECT data FROM sources WHERE id = ?").bind(id).first<Row>();
  return row ? (JSON.parse(row.data as string) as Source) : null;
}

/* --------------------------------- Reviews --------------------------------- */

export async function saveReviews(reviews: Review[]) {
  const stmt = db().prepare(
    `INSERT INTO reviews (source_id, review_id, positive, text, language, hours_total, hours_at_review, helpful,
       funny, created_at, early_access, free_copy, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_id, review_id) DO UPDATE SET text = excluded.text, hours_total = excluded.hours_total,
       helpful = excluded.helpful, funny = excluded.funny, fetched_at = excluded.fetched_at`,
  );
  const now = Date.now();
  const all = reviews.map((r) =>
    stmt.bind(
      r.sourceId, r.reviewId, r.positive ? 1 : 0, r.text, r.language, r.hoursTotal, r.hoursAtReview,
      r.helpful, r.funny, r.createdAt, r.earlyAccess ? 1 : 0, r.freeCopy ? 1 : 0, now,
    ),
  );
  // D1 batches run as one transaction; chunks keep each request comfortably small.
  for (let i = 0; i < all.length; i += 100) await db().batch(all.slice(i, i + 100));
}

function toReview(row: Row): Review {
  return {
    sourceId: row.source_id as string,
    reviewId: row.review_id as string,
    positive: row.positive === 1,
    text: row.text as string,
    language: row.language as string,
    hoursTotal: row.hours_total as number,
    hoursAtReview: row.hours_at_review as number,
    helpful: row.helpful as number,
    funny: row.funny as number,
    createdAt: row.created_at as number,
    earlyAccess: row.early_access === 1,
    freeCopy: row.free_copy === 1,
  };
}

export async function getReviews(sourceId: string, ids: string[]): Promise<Review[]> {
  if (!ids.length) return [];
  const { results } = await db()
    .prepare(`SELECT * FROM reviews WHERE source_id = ? AND review_id IN (SELECT value FROM json_each(?))`)
    .bind(sourceId, JSON.stringify(ids))
    .all<Row>();
  return results.map(toReview);
}

export async function searchReviews(
  sourceId: string,
  opts: { query?: string; sentiment?: "positive" | "negative"; minHours?: number; maxHours?: number; limit?: number },
): Promise<Review[]> {
  const where = ["source_id = ?"];
  const args: (string | number)[] = [sourceId];
  if (opts.query) {
    where.push("text LIKE ?");
    args.push(`%${opts.query}%`);
  }
  if (opts.sentiment) {
    where.push("positive = ?");
    args.push(opts.sentiment === "positive" ? 1 : 0);
  }
  if (opts.minHours != null) {
    where.push("hours_at_review >= ?");
    args.push(opts.minHours);
  }
  if (opts.maxHours != null) {
    where.push("hours_at_review <= ?");
    args.push(opts.maxHours);
  }
  args.push(Math.min(opts.limit ?? 30, 200));
  const { results } = await db()
    .prepare(`SELECT * FROM reviews WHERE ${where.join(" AND ")} ORDER BY helpful DESC LIMIT ?`)
    .bind(...args)
    .all<Row>();
  return results.map(toReview);
}

/* -------------------------------- Analyses -------------------------------- */

export async function saveAnalysis(a: Omit<Analysis, "id">): Promise<number> {
  const row = await db()
    .prepare(
      `INSERT INTO analyses (source_id, created_at, options, eras, sample, report, model, usage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      a.sourceId, a.createdAt, JSON.stringify(a.options), JSON.stringify(a.eras), JSON.stringify(a.sample),
      JSON.stringify(a.report), a.model, a.usage ? JSON.stringify(a.usage) : null,
    )
    .first<{ id: number }>();
  return row!.id;
}

function toAnalysis(row: Row): Analysis {
  return {
    id: row.id as number,
    sourceId: row.source_id as string,
    createdAt: row.created_at as number,
    options: JSON.parse(row.options as string) as SampleOptions,
    eras: JSON.parse(row.eras as string) as Era[],
    sample: JSON.parse(row.sample as string) as SampleReview[],
    report: JSON.parse(row.report as string) as Report,
    model: row.model as string,
    usage: row.usage ? JSON.parse(row.usage as string) : null,
  };
}

export async function getAnalysis(id: number): Promise<Analysis | null> {
  if (!Number.isInteger(id)) return null;
  const row = await db().prepare("SELECT * FROM analyses WHERE id = ?").bind(id).first<Row>();
  return row ? toAnalysis(row) : null;
}

export async function latestAnalysisFor(sourceId: string): Promise<Analysis | null> {
  const row = await db()
    .prepare("SELECT * FROM analyses WHERE source_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(sourceId)
    .first<Row>();
  return row ? toAnalysis(row) : null;
}

/** The newest analysis of every source, newest first. */
export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const { results } = await db()
    .prepare(
      `SELECT a.*, s.data AS source_data FROM analyses a JOIN sources s ON s.id = a.source_id
       WHERE a.id = (SELECT id FROM analyses WHERE source_id = a.source_id ORDER BY created_at DESC LIMIT 1)
       ORDER BY a.created_at DESC`,
    )
    .all<Row>();
  return results.map((row) => toListItem(toAnalysis(row), JSON.parse(row.source_data as string) as Source));
}

function toListItem(a: Analysis, source: Source): AnalysisListItem {
  return {
    id: a.id,
    createdAt: a.createdAt,
    sampleSize: a.sample.length,
    source,
    summary: a.report.summary,
    strip: a.sample.map(({ positive, createdAt, helpful }) => ({ positive, createdAt, helpful })),
  };
}

/** The latest analysis of each given source, in the given order, skipping sources never analyzed. */
export async function listAnalysesFor(sourceIds: string[]): Promise<AnalysisListItem[]> {
  const items = await Promise.all(
    sourceIds.map(async (id) => {
      const [a, source] = await Promise.all([latestAnalysisFor(id), getSource(id)]);
      return a && source ? toListItem(a, source) : null;
    }),
  );
  return items.filter((x): x is AnalysisListItem => !!x);
}

export async function deleteSource(id: string) {
  await db().prepare("DELETE FROM sources WHERE id = ?").bind(id).run();
}
