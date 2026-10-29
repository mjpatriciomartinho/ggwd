"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { EngineLog, EngineYard } from "./Engines";
import { PIPELINE, type EngineEvent, type Job } from "@/lib/types";

type Mode = "link" | "describe";

interface Options {
  perSide: number;
  language: string;
  reportLanguage: "en" | "es";
}

interface Suggestion {
  appid: string;
  name: string;
  image: string | null;
  capsule: string | null;
  url: string;
  role: "closest" | "leader" | "cautionary" | "adjacent";
  why: string;
  totals: { positive: number; total: number; scoreLabel: string | null } | null;
}

const ROLE = {
  leader: "Benchmark",
  closest: "Closest match",
  cautionary: "Cautionary tale",
  adjacent: "Same audience",
} as const;

const EXAMPLES = [
  { name: "Stardew Valley", url: "https://store.steampowered.com/app/413150/Stardew_Valley/" },
  { name: "Hades", url: "https://store.steampowered.com/app/1145360/Hades/" },
  { name: "Dome Keeper", url: "https://store.steampowered.com/app/1637320/Dome_Keeper/" },
];

const num = new Intl.NumberFormat("en-US");

export function AnalyzeApp({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [options, setOptions] = useState<Options>({ perSide: 200, language: "english", reportLanguage: "en" });
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobEvents, setJobEvents] = useState<Record<string, EngineEvent[]>>({});
  const [runEvents, setRunEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = useRef<string | null>(null);

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");

  useEffect(() => {
    if (!active.length) return;
    const t = setInterval(async () => {
      const next = await Promise.all(
        jobs.map(async (j) => {
          if (j.status === "done" || j.status === "error") return j;
          const res = await fetch(`/api/jobs/${j.id}`).catch(() => null);
          if (!res?.ok) return j;
          const data = (await res.json()) as { job: Job; events: EngineEvent[] };
          setJobEvents((prev) => ({ ...prev, [j.id]: data.events }));
          // Suggested games keep their name instead of the URL.
          return { ...data.job, url: j.url };
        }),
      );
      setJobs(next);
      const solo = next.length === 1 ? next[0] : null;
      if (solo && solo.id === redirectTo.current && solo.status === "done" && solo.analysisId) {
        router.push(`/report/${solo.analysisId}`);
      }
      if (next.every((j) => j.status === "done" || j.status === "error")) router.refresh();
    }, 1200);
    return () => clearInterval(t);
  }, [active.length, jobs, router]);

  async function start(target: string): Promise<Job | null> {
    const res = await fetch("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target, ...options }),
    });
    const data = (await res.json()) as { job?: Job; error?: string };
    if (!res.ok || !data.job) {
      setError(data.error ?? "Couldn't start the analysis.");
      return null;
    }
    return data.job;
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const job = await start(url);
    if (!job) return;
    redirectTo.current = job.id;
    setJobs([job]);
  }

  async function suggest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuggesting(true);
    setSuggestions([]);
    setReading(null);
    setRunEvents([]);
    // Watch the engines work while we wait for the answer.
    const runId = crypto.randomUUID();
    const poll = setInterval(async () => {
      const res = await fetch(`/api/runs/${runId}`).catch(() => null);
      if (res?.ok) setRunEvents(((await res.json()) as { events: EngineEvent[] }).events);
    }, 1000);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, runId }),
      });
      const data = (await res.json()) as { reading?: string; games?: Suggestion[]; error?: string };
      if (!res.ok || !data.games) throw new Error(data.error ?? "Couldn't suggest games.");
      setReading(data.reading ?? null);
      setSuggestions(data.games);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't suggest games.");
    } finally {
      clearInterval(poll);
      const res = await fetch(`/api/runs/${runId}`).catch(() => null);
      if (res?.ok) setRunEvents(((await res.json()) as { events: EngineEvent[] }).events);
      setSuggesting(false);
    }
  }

  async function analyzeSelected() {
    setError(null);
    const started: Job[] = [];
    for (const s of suggestions.filter((g) => selected.has(g.appid))) {
      const job = await start(s.url);
      if (job) started.push({ ...job, url: s.name });
    }
    redirectTo.current = null;
    setJobs((prev) => [...started, ...prev]);
  }

  const busy = active.length > 0;

  return (
    <div>
      <div role="tablist" className="inline-flex rounded-xl border border-line bg-sheet p-1 text-sm">
        {(
          [
            ["link", "I have a game in mind"],
            ["describe", "Describe my game"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg px-4 py-2 font-medium ${mode === m ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "link" ? (
        <form onSubmit={submitLink} className="mt-5 rounded-2xl border border-line bg-sheet p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="url">
              Steam store link
            </label>
            <input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="store.steampowered.com/app/…"
              disabled={busy}
              className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3.5 text-lg outline-none placeholder:text-ink-3 focus-visible:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="font-display btn-hot rounded-lg px-6 py-3.5 font-bold uppercase disabled:opacity-40"
            >
              {busy ? "Engines running…" : "Fire it up"}
            </button>
          </div>
          <OptionsBar options={options} setOptions={setOptions} disabled={busy} />
        </form>
      ) : (
        <form onSubmit={suggest} className="mt-5 rounded-2xl border border-line bg-sheet p-2">
          <label className="sr-only" htmlFor="desc">
            Describe your game
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            disabled={suggesting}
            placeholder="Genre, core loop, setting, session length, who it's for. For example: a cozy roguelite deckbuilder where you run a bakery in a haunted village, 20-minute runs, for Balatro and Stardew fans."
            className="w-full resize-y rounded-xl bg-transparent px-4 py-3.5 leading-relaxed outline-none placeholder:text-ink-3 focus-visible:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 pt-2.5 pb-1.5">
            <p className="text-sm text-ink-3">Free. Nano reads your pitch, Tavily scouts the market, Super picks the games.</p>
            <button
              type="submit"
              disabled={suggesting || description.trim().length < 30}
              className="font-display btn-hot rounded-lg px-5 py-2.5 font-bold uppercase disabled:opacity-40"
            >
              {suggesting ? "Finding games…" : "Suggest games to study"}
            </button>
          </div>
        </form>
      )}

      {mode === "link" && !jobs.length && !error && (
        <p className="mt-4 text-sm text-ink-3">
          Try{" "}
          {EXAMPLES.map((ex, i) => (
            <span key={ex.name}>
              <button type="button" onClick={() => setUrl(ex.url)} className="text-ink-2 underline decoration-line underline-offset-4 hover:decoration-ink-2">
                {ex.name}
              </button>
              {i < EXAMPLES.length - 2 ? ", " : i === EXAMPLES.length - 2 ? " or " : "."}
            </span>
          ))}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-neg-soft px-4 py-3 text-sm text-neg">
          {error}
        </p>
      )}

      {mode === "describe" && (suggesting || suggestions.length > 0) && (
        <section className="mt-8" aria-busy={suggesting}>
          {(suggesting || runEvents.length > 0) && (
            <div className="hud mb-6 rounded-xl p-5">
              <p className="font-pixel mb-3 text-xs text-ink-3 uppercase">{suggesting ? "Engines at work" : "How these picks were made"}</p>
              <EngineYard events={runEvents} idleText={suggesting ? "Firing up…" : "Done"} />
              <div className="mt-4 border-t border-line pt-3">
                <EngineLog events={runEvents} />
              </div>
            </div>
          )}
          {suggesting && <SuggestSkeleton />}
          {reading && <p className="max-w-[70ch] text-ink-2">We read it as: {reading}</p>}
          {suggestions.length > 0 && (
            <>
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {suggestions.map((g) => {
                  const on = selected.has(g.appid);
                  const pct = g.totals?.total ? Math.round((g.totals.positive / g.totals.total) * 100) : null;
                  return (
                    <li key={g.appid}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(g.appid)) next.delete(g.appid);
                            else next.add(g.appid);
                            return next;
                          })
                        }
                        aria-pressed={on}
                        className={`grid h-full w-full grid-cols-[120px_1fr] gap-4 rounded-2xl border p-3 text-left transition-colors ${on ? "border-ink bg-sheet" : "border-line hover:border-ink-3"}`}
                      >
                        <span className="relative">
                          {g.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={g.image}
                              alt=""
                              className="aspect-[460/215] w-full rounded-md object-cover"
                              onError={(e) => {
                                if (g.capsule && e.currentTarget.src !== g.capsule) e.currentTarget.src = g.capsule;
                              }}
                            />
                          )}
                          <span
                            className={`absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full border-2 border-paper ${on ? "bg-ink text-paper" : "bg-line text-transparent"}`}
                          >
                            <Check size={14} aria-hidden />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="font-display truncate font-semibold">{g.name}</span>
                            <span className="shrink-0 text-xs text-ink-3">{ROLE[g.role]}</span>
                          </span>
                          <span className="mt-1 block text-sm leading-snug text-ink-2">{g.why}</span>
                          {g.totals && (
                            <span className="tnum mt-1.5 block text-xs text-ink-3">
                              {pct}% positive · {num.format(g.totals.total)} reviews
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="sticky bottom-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper/95 p-3 pl-5 backdrop-blur">
                <p className="text-sm text-ink-2">
                  {selected.size ? `${selected.size} selected · ${selected.size} ${selected.size === 1 ? "report" : "reports"}` : "Pick the games you want reports on."}
                </p>
                <div className="flex items-center gap-4">
                  <OptionsBar options={options} setOptions={setOptions} disabled={busy} compact />
                  <button
                    onClick={analyzeSelected}
                    disabled={!selected.size}
                    className="font-display btn-hot rounded-lg px-5 py-2.5 font-bold uppercase disabled:opacity-40"
                  >
                    Analyze selected
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {jobs.length > 0 && (
        <ul className="mt-8 space-y-5" aria-live="polite">
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} events={jobEvents[j.id] ?? []} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OptionsBar({
  options,
  setOptions,
  disabled,
  compact,
}: {
  options: Options;
  setOptions: (o: Options) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "hidden items-center gap-4 text-sm lg:flex" : "flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-3 pt-2.5 pb-1.5 text-sm text-ink-2"}>
      <Select
        label="Sample"
        value={options.perSide}
        disabled={disabled}
        onChange={(v) => setOptions({ ...options, perSide: Number(v) })}
        options={[
          { value: 100, label: compact ? "200" : "200 reviews (quick)" },
          { value: 200, label: compact ? "400" : "400 reviews (recommended)" },
          { value: 350, label: compact ? "700" : "700 reviews (in depth)" },
        ]}
      />
      <Select
        label="Reviews in"
        value={options.language}
        disabled={disabled}
        onChange={(v) => setOptions({ ...options, language: v })}
        options={[
          { value: "english", label: "English" },
          { value: "spanish", label: "Spanish" },
          { value: "all", label: "all languages" },
        ]}
      />
      {!compact && (
        <Select
          label="Report in"
          value={options.reportLanguage}
          disabled={disabled}
          onChange={(v) => setOptions({ ...options, reportLanguage: v as "en" | "es" })}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Spanish" },
          ]}
        />
      )}
    </div>
  );
}

function Select<T extends string | number>({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: string) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-ink-3">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="cursor-pointer rounded-md bg-transparent py-1 font-medium text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const ENGINE_COLOR = { steam: "var(--ink-2)", tavily: "var(--tv)", nebius: "var(--nv)" } as const;

function JobRow({ job, events }: { job: Job; events: EngineEvent[] }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (job.status === "done" || job.status === "error") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - job.createdAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [job.status, job.createdAt]);

  const current = job.status === "done" ? PIPELINE.length : Math.max(0, PIPELINE.findIndex((p) => p.key === job.step));
  const pct = job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : null;
  // Suggested games arrive with their name; pasted links show the slug Steam puts in the URL.
  const title = job.url.startsWith("http")
    ? job.url.replace(/^https?:\/\/store\.steampowered\.com\/app\/\d+\/?/, "").replace(/[_/]+/g, " ").trim() || "Steam game"
    : job.url;

  return (
    <li className="hud rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 truncate">
          <span className="font-display text-xl font-bold">{title}</span>
          <span className="text-sm text-ink-3"> · {job.status === "error" ? "Crashed" : job.status === "done" ? "Done" : job.stage}</span>
        </span>
        {job.status === "done" && job.analysisId ? (
          <Link href={`/report/${job.analysisId}`} className="font-display btn-hot shrink-0 rounded-lg px-4 py-2 text-sm font-bold uppercase">
            Open report
          </Link>
        ) : (
          job.status !== "error" && <span className="font-pixel tnum text-xs text-ink-3">{elapsed}s</span>
        )}
      </div>

      {/* One bar per pipeline step, colored by the engine that runs it. */}
      <ol className="mt-4 grid grid-cols-5 gap-1.5">
        {PIPELINE.map((p, i) => {
          const color = ENGINE_COLOR[p.engine];
          const state = i < current ? "done" : i === current && job.status !== "error" ? "now" : i === current ? "fail" : "todo";
          return (
            <li key={p.key}>
              <p className="font-pixel mb-1 truncate text-[10px] uppercase" style={{ color: state === "todo" ? "var(--ink-3)" : color }}>
                {p.label}
              </p>
              <div className="h-3 overflow-hidden rounded-sm border border-line bg-paper">
                <div
                  className={`h-full transition-[width] duration-700 ${state === "now" ? "stripes" : ""}`}
                  style={{
                    background: state === "fail" ? "var(--neg)" : color,
                    width: state === "done" || state === "fail" ? "100%" : state === "now" ? `${pct ?? 100}%` : "0%",
                    opacity: state === "now" && pct == null ? 0.6 : 1,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {job.status === "error" ? (
        <p className="mt-3 text-sm text-neg">{job.error}</p>
      ) : (
        job.status !== "done" && (
          <p className="mt-2 text-sm text-ink-3">
            {job.detail}
            {pct != null && job.step === "collect" && ` · ${job.done} of ${job.total}`}
          </p>
        )
      )}

      {events.length > 0 && (
        <div className="mt-5 grid gap-5 border-t border-line pt-4 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="self-start">
            <EngineYard events={events} idleText={job.status === "done" ? "Parked" : "Waiting for the next engine"} />
          </div>
          <EngineLog events={events} max={8} />
        </div>
      )}
    </li>
  );
}

function SuggestSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="grid grid-cols-[120px_1fr] gap-4 rounded-2xl border border-line p-3">
          <div className="aspect-[460/215] animate-pulse rounded-md bg-line" />
          <div className="space-y-2 pt-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
            <div className="h-3 w-full animate-pulse rounded bg-line/70" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-line/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
