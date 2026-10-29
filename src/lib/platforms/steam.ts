import "server-only";
import type { Era, Review, SampleOptions, Source } from "../types";

// Steam store reviews. No API key: the store page itself loads reviews from /ajaxappreviews/{appid}
// (the old /appreviews/{appid}?json=1 now redirects to the home page). With filter=all the results come
// sorted by helpfulness, and date_range_type=include + start/end lets us take the most helpful reviews
// of any window of the game's life, not just the last year (day_range is capped at 365).

const STORE = "https://store.steampowered.com";
const PAGE_SIZE = 100;
const MIN_CHARS = 40; // "good game" tells us nothing
const MAX_PAGES_PER_WINDOW = 8;
const REQUEST_GAP_MS = 900;
const DAY = 86400;

export class SteamError extends Error {}

export function parseSteamUrl(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{1,10}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ggwd review research)", Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 && attempt < 3) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (res.status >= 300 && res.status < 400) throw new SteamError("Steam redirected the request; the reviews endpoint may have moved.");
    if (!res.ok) throw new SteamError(`Steam answered HTTP ${res.status}.`);
    return (await res.json()) as T;
  }
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Steam writes release dates as "Feb 26, 2016" or "20 Feb, 2024" depending on the store region. */
function parseReleaseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const month = MONTHS.findIndex((m) => raw.toLowerCase().includes(m));
  const year = raw.match(/\b(19|20)\d{2}\b/)?.[0];
  const day = raw.replace(year ?? "", "").match(/\b\d{1,2}\b/)?.[0] ?? "1";
  if (month < 0 || !year) return null;
  return new Date(Date.UTC(Number(year), month, Number(day))).toISOString().slice(0, 10);
}

interface AppDetails {
  [appid: string]: {
    success: boolean;
    data?: {
      name: string;
      type: string;
      header_image?: string;
      developers?: string[];
      genres?: { description: string }[];
      release_date?: { coming_soon: boolean; date: string };
      short_description?: string;
    };
  };
}

interface ReviewsResponse {
  success: number;
  cursor?: string;
  query_summary?: {
    review_score_desc?: string;
    total_positive?: number;
    total_negative?: number;
    total_reviews?: number;
  };
  reviews?: {
    recommendationid: string;
    author: { playtime_forever: number; playtime_at_review?: number };
    language: string;
    review: string;
    timestamp_created: number;
    voted_up: boolean;
    votes_up: number;
    votes_funny: number;
    steam_purchase: boolean;
    received_for_free: boolean;
    written_during_early_access: boolean;
  }[];
}

function reviewsUrl(appid: string, params: Record<string, string | number>) {
  const q = new URLSearchParams({
    filter_offtopic_activity: "1", // leave review bombs out
    playtime_filter_min: "0",
    playtime_filter_max: "0",
    playtime_type: "all",
    purchase_type: "all",
    use_review_quality: "1",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `${STORE}/ajaxappreviews/${appid}?${q}`;
}

export async function fetchSource(appid: string): Promise<Source> {
  const details = await getJson<AppDetails>(`${STORE}/api/appdetails?appids=${appid}&l=english&cc=us`);
  const app = details[appid];
  if (!app?.success || !app.data) throw new SteamError(`There is no Steam game with id ${appid}.`);
  const totals = await summaryFor(appid);
  return {
    id: `steam-${appid}`,
    platform: "steam",
    externalId: appid,
    name: app.data.name,
    url: `${STORE}/app/${appid}/`,
    image: app.data.header_image ?? null,
    developer: app.data.developers?.join(", ") || null,
    genres: app.data.genres?.map((g) => g.description) ?? [],
    releaseDate: parseReleaseDate(app.data.release_date?.date),
    description: app.data.short_description ?? null,
    totals,
    updatedAt: Date.now(),
  };
}

/** Overall review counts across all languages, as shown on the store page. */
export async function summaryFor(appid: string): Promise<Source["totals"]> {
  const summary = await getJson<ReviewsResponse>(
    reviewsUrl(appid, {
      filter: "summary",
      language: "all",
      review_type: "all",
      num_per_page: 0,
      cursor: "*",
      day_range: 30,
      date_range_type: "all",
      start_date: -1,
      end_date: -1,
    }),
  );
  const s = summary.query_summary;
  if (!s) return null;
  return {
    positive: s.total_positive ?? 0,
    negative: s.total_negative ?? 0,
    total: s.total_reviews ?? 0,
    scoreLabel: s.review_score_desc ?? null,
  };
}

const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Resolve a game title to a Steam app through the store's own search box. */
export async function searchSteam(
  title: string,
): Promise<{ appid: string; name: string; image: string | null; capsule: string | null; url: string } | null> {
  const res = await getJson<{ items?: { type: string; name: string; id: number; tiny_image?: string }[] }>(
    `${STORE}/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
  );
  const apps = (res.items ?? []).filter((i) => i.type === "app");
  const hit = apps.find((i) => normTitle(i.name) === normTitle(title)) ?? apps[0];
  if (!hit) return null;
  return {
    appid: String(hit.id),
    name: hit.name,
    // The search only returns a small capsule. The unhashed header path works for most apps but not all,
    // so the capsule travels along as a fallback.
    image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${hit.id}/header.jpg`,
    capsule: hit.tiny_image ?? null,
    url: `${STORE}/app/${hit.id}/`,
  };
}

const fmtMonth = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Split the game's life into eras and decide how much of the sample each gets. The launch tells you
 * what hooked (or burned) the first players, the last year tells you how the game reads today, and
 * the stretch in between shows what held up.
 */
export function planEras(releaseDate: string | null, now = Math.floor(Date.now() / 1000)): (Era & { weight: number })[] {
  // Two quirks of Steam's date ranges: bounds must be whole UTC days, and a range that ends inside the
  // last 365 days gets clipped to that last year. So days are snapped to midnight and every older era
  // stops two days before the "last 12 months" one starts.
  now = Math.ceil(now / DAY) * DAY;
  const release = releaseDate ? Math.floor(Date.parse(releaseDate) / 1000) : null;
  const yearAgo = now - 365 * DAY;
  const olderEnd = yearAgo - 2 * DAY;
  if (!release || release > now) {
    return [
      { key: "recent", label: "Last 12 months", from: yearAgo, to: now, weight: 0.6 },
      { key: "earlier", label: "Before that", from: 0, to: olderEnd, weight: 0.4 },
    ];
  }
  const age = now - release;
  if (age < 200 * DAY) {
    return [{ key: "all", label: `Since launch (${fmtMonth(release)})`, from: release - 30 * DAY, to: now, weight: 1 }];
  }
  const launchEnd = release + 90 * DAY;
  if (age < 455 * DAY) {
    return [
      { key: "launch", label: `Launch (${fmtMonth(release)}–${fmtMonth(launchEnd)})`, from: release - 30 * DAY, to: release < yearAgo ? Math.min(launchEnd, olderEnd) : launchEnd, weight: 0.4 },
      { key: "recent", label: "Since then", from: launchEnd, to: now, weight: 0.6 },
    ];
  }
  const eras: (Era & { weight: number })[] = [
    { key: "launch", label: `Launch (${fmtMonth(release)}–${fmtMonth(launchEnd)})`, from: release - 30 * DAY, to: launchEnd, weight: 0.25 },
  ];
  const middle = olderEnd - launchEnd;
  const middleSlices = middle > 3 * 365 * DAY ? 2 : 1;
  for (let i = 0; i < middleSlices; i++) {
    const from = launchEnd + Math.floor((middle * i) / middleSlices / DAY) * DAY;
    const to = launchEnd + Math.floor((middle * (i + 1)) / middleSlices / DAY) * DAY;
    eras.push({ key: `mid${i + 1}`, label: `${fmtMonth(from)}–${fmtMonth(to)}`, from, to, weight: 0.35 / middleSlices });
  }
  eras.push({ key: "recent", label: "Last 12 months", from: yearAgo, to: now, weight: 0.4 });
  return eras;
}

/** Steam reviews are BBCode; the model and the UI want plain text. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, "$1")
    .replace(/\[\/?(h[1-6]|b|i|u|s|strike|quote|code|list|olist|table|tr|th|td|noparse|\*|hr)[^\]]*\]/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export interface CollectProgress {
  stage: string;
  detail: string;
  done: number;
  total: number;
}

/**
 * Pull the most helpful positive and negative reviews from every era, `perSide` of each in total.
 * Returns the reviews plus which era each one came from.
 */
export async function collectReviews(
  source: Source,
  opts: SampleOptions,
  onProgress: (p: CollectProgress) => void,
): Promise<{ reviews: Review[]; eraOf: Map<string, string>; eras: Era[] }> {
  const appid = source.externalId;
  const planned = planEras(source.releaseDate);
  const total = opts.perSide * 2;
  const seen = new Map<string, Review>();
  const eraOf = new Map<string, string>();
  let collected = 0;

  for (const positive of [true, false]) {
    // Quotas are per era; whatever an era can't fill rolls over to the next one.
    let carry = 0;
    let sideGot = 0;
    for (const [i, era] of planned.entries()) {
      const isLast = i === planned.length - 1;
      const quota = isLast ? opts.perSide - sideGot : Math.round(opts.perSide * era.weight) + carry;
      let got = 0;
      let cursor = "*";
      for (let page = 0; page < MAX_PAGES_PER_WINDOW && got < quota; page++) {
        onProgress({
          stage: `Reading ${positive ? "positive" : "negative"} reviews`,
          detail: era.label,
          done: collected,
          total,
        });
        const res = await getJson<ReviewsResponse>(
          reviewsUrl(appid, {
            filter: "all",
            language: opts.language,
            review_type: positive ? "positive" : "negative",
            num_per_page: PAGE_SIZE,
            cursor,
            day_range: 365,
            date_range_type: "include",
            start_date: Math.max(era.from, 0),
            end_date: era.to,
          }),
        );
        if (res.success !== 1) throw new SteamError("Steam refused the reviews request.");
        const batch = res.reviews ?? [];
        for (const r of batch) {
          if (got >= quota) break;
          if (seen.has(r.recommendationid)) continue;
          const text = cleanText(r.review);
          if (text.length < MIN_CHARS) continue;
          seen.set(r.recommendationid, {
            sourceId: source.id,
            reviewId: r.recommendationid,
            positive: r.voted_up,
            text,
            language: r.language,
            hoursTotal: Math.round((r.author.playtime_forever / 60) * 10) / 10,
            hoursAtReview: Math.round(((r.author.playtime_at_review ?? r.author.playtime_forever) / 60) * 10) / 10,
            helpful: r.votes_up,
            funny: r.votes_funny,
            createdAt: r.timestamp_created,
            earlyAccess: r.written_during_early_access,
            freeCopy: r.received_for_free,
          });
          eraOf.set(r.recommendationid, era.key);
          got++;
          collected++;
        }
        // Steam sometimes returns a short page mid-stream, so only an empty page or a stuck cursor means the end.
        if (!batch.length || !res.cursor || res.cursor === cursor) break;
        cursor = res.cursor;
        await sleep(REQUEST_GAP_MS);
      }
      sideGot += got;
      carry = Math.max(0, quota - got);
      await sleep(REQUEST_GAP_MS);
    }
  }
  onProgress({ stage: "Reviews collected", detail: `${seen.size} reviews`, done: seen.size, total });
  return { reviews: [...seen.values()], eraOf, eras: planned.map((e) => ({ key: e.key, label: e.label, from: e.from, to: e.to })) };
}
