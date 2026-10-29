// Shared shapes between the server, the UI and the MCP server. Kept free of server-only imports.

export type PlatformId = "steam"; // "appstore" | "googleplay" later

export interface Source {
  id: string; // `${platform}-${externalId}`, e.g. "steam-413150"
  platform: PlatformId;
  externalId: string;
  name: string;
  url: string;
  image: string | null;
  developer: string | null;
  genres: string[];
  releaseDate: string | null; // ISO date
  description: string | null;
  totals: {
    positive: number;
    negative: number;
    total: number;
    scoreLabel: string | null;
  } | null;
  updatedAt: number;
}

export interface Review {
  sourceId: string;
  reviewId: string;
  positive: boolean;
  text: string;
  language: string;
  hoursTotal: number;
  hoursAtReview: number;
  helpful: number;
  funny: number;
  createdAt: number; // unix seconds
  earlyAccess: boolean;
  freeCopy: boolean;
}

/** One slice of the game's life we sampled the most helpful reviews from. */
export interface Era {
  key: string;
  label: string;
  from: number; // unix seconds
  to: number;
}

export interface SampleOptions {
  perSide: number; // reviews per sentiment
  language: string; // Steam language code or "all"
  reportLanguage: "es" | "en";
}

export type ThemeKind = "love" | "pain" | "request";

export interface ThemeStats {
  reviews: number;
  share: number; // of the whole sample, 0–1
  positiveShare: number; // of this theme's reviews, 0–1
  medianHours: number;
  helpfulVotes: number;
  weight: number; // ranking score: reviews weighted by helpful votes
  byEra: Record<string, number>;
}

export interface Quote {
  reviewId: string;
  text: string;
  positive: boolean;
  hours: number;
  helpful: number;
}

export interface Theme {
  key: string;
  kind: ThemeKind;
  title: string;
  description: string;
  takeaway: string;
  severity: "dealbreaker" | "major" | "minor" | null;
  reviewIds: string[];
  quotes: Quote[];
  stats: ThemeStats;
}

/** Something that happened to the game outside its reviews (an update, a launch, a controversy), found on the web. */
export interface OutsideEvent {
  date: string | null; // "2024-03" or "2024-03-19"
  title: string;
  kind: "launch" | "update" | "news" | "controversy" | "sale";
  url: string;
}

export interface Report {
  summary: string;
  playerProfile: string;
  evolution: string;
  earlyExit: { summary: string; reasons: { title: string; reviewIds: string[] }[] };
  takeaways: { title: string; detail: string }[];
  themes: Theme[];
  /** Web context from Tavily, used to explain why opinion moved. Older reports don't have it. */
  outside?: { summary: string; events: OutsideEvent[] };
}

export interface SampleReview {
  id: string;
  positive: boolean;
  createdAt: number;
  hours: number;
  hoursAtReview: number;
  helpful: number;
  era: string;
}

export interface Analysis {
  id: number;
  sourceId: string;
  createdAt: number;
  options: SampleOptions;
  eras: Era[];
  sample: SampleReview[];
  report: Report;
  model: string;
  usage: Usage | null;
}

/** Which engines built a report, and how much each one worked. */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  byModel?: { model: string; label: string; tasks: string[]; calls: number; inputTokens: number; outputTokens: number }[];
  searches?: number;
}

export interface AnalysisListItem {
  id: number;
  createdAt: number;
  sampleSize: number;
  source: Source;
  summary: string;
  strip: Pick<SampleReview, "positive" | "createdAt" | "helpful">[];
}

export type JobStatus = "queued" | "running" | "done" | "error";

/** The analysis pipeline, in order. Each step is run by one kind of engine. */
export const PIPELINE = [
  { key: "lookup", label: "Lookup", engine: "steam" },
  { key: "collect", label: "Collect", engine: "steam" },
  { key: "scout", label: "Scout", engine: "tavily" },
  { key: "skim", label: "Skim", engine: "nebius" },
  { key: "synthesize", label: "Synthesize", engine: "nebius" },
] as const;
export type PipelineStep = (typeof PIPELINE)[number]["key"];

export type Provider = "nebius" | "tavily";
export type EngineStatus = "running" | "done" | "error" | "skipped";

/** One call to an AI model or a web search: what it was for, why that engine, and how it went. */
export interface EngineEvent {
  id: string;
  runId: string | null; // the job, or the suggestion run, it belongs to
  provider: Provider;
  model: string; // model id, or "search" for Tavily
  label: string; // short name for the UI, e.g. "Nemotron 3 Ultra"
  task: string;
  reason: string;
  status: EngineStatus;
  detail: string;
  inputTokens: number;
  outputTokens: number;
  startedAt: number;
  endedAt: number | null;
}

export interface Job {
  id: string;
  sourceId: string | null;
  url: string;
  status: JobStatus;
  step: PipelineStep | "";
  stage: string;
  detail: string;
  done: number;
  total: number;
  error: string | null;
  analysisId: number | null;
  createdAt: number;
}
