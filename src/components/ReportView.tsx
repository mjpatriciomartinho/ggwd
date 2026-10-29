"use client";

import { useMemo, useState } from "react";
import { Chorus } from "./Chorus";
import { ExportPanel } from "./ExportPanel";
import { SteamEngine } from "./Engines";
import type { Analysis, OutsideEvent, Review, Source, Theme, ThemeKind } from "@/lib/types";

const KINDS: { kind: ThemeKind; title: string; blurb: string; color: string; soft: string }[] = [
  { kind: "love", title: "What hooks players", blurb: "What players celebrate, even inside negative reviews.", color: "var(--pos)", soft: "var(--pos-soft)" },
  { kind: "pain", title: "What frustrates them", blurb: "Complaints ranked by how many players share them and how much they were upvoted.", color: "var(--neg)", soft: "var(--neg-soft)" },
  { kind: "request", title: "What they ask for", blurb: "What players miss, or want in an update or a sequel.", color: "var(--ask)", soft: "var(--ask-soft)" },
];

const SEVERITY = { dealbreaker: "Makes people quit", major: "Major", minor: "Minor" } as const;

const num = new Intl.NumberFormat("en-US");

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export function ReportView({ analysis, source, reviews, isExample }: { analysis: Analysis; source: Source; reviews: Review[]; isExample: boolean }) {
  const report = analysis.report;
  const byId = useMemo(() => new Map(reviews.map((r) => [r.reviewId, r])), [reviews]);
  const [focus, setFocus] = useState<{ label: string; ids: string[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const highlight = useMemo(() => (focus ? new Set(focus.ids) : null), [focus]);
  const strip = useMemo(() => analysis.sample.map((s) => ({ ...s })), [analysis.sample]);
  const t = source.totals;
  const pct = t && t.total ? Math.round((t.positive / t.total) * 100) : null;
  const maxShare = Math.max(...report.themes.map((th) => th.stats.share), 0.01);
  const markers = useMemo(
    () =>
      (report.outside?.events ?? []).flatMap((e) => {
        const t = toUnix(e.date);
        return t ? [{ t, label: `${e.date} · ${e.title}` }] : [];
      }),
    [report.outside],
  );

  function toggle(theme: Theme) {
    const next = open === theme.key ? null : theme.key;
    setOpen(next);
    setFocus(next ? { label: theme.title, ids: theme.reviewIds } : null);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-8">
      {/* Masthead */}
      <section className="grid gap-8 pt-12 pb-10 sm:pt-16 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-ink-3 hover:text-ink-2">
            {source.developer ?? "Steam"}
            {source.releaseDate && ` · ${monthFmt.format(new Date(source.releaseDate))}`}
            {source.genres.length > 0 && ` · ${source.genres.slice(0, 3).join(", ")}`}
          </a>
          <h1 className="font-display mt-2 text-[clamp(2.4rem,6.5vw,4.6rem)] leading-[0.95] font-bold tracking-[-0.035em] break-words">
            {source.name}
          </h1>
        </div>
        {t && (
          <dl className="flex gap-8 md:text-right">
            <div>
              <dt className="text-sm text-ink-3">On Steam</dt>
              <dd className="font-display tnum text-3xl font-semibold tracking-tight">{pct}%</dd>
              <dd className="text-sm text-ink-3">{t.scoreLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">Total reviews</dt>
              <dd className="font-display tnum text-3xl font-semibold tracking-tight">{num.format(t.total)}</dd>
              <dd className="tnum text-sm text-ink-3">{analysis.sample.length} sampled</dd>
            </div>
          </dl>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <p className="font-display max-w-[62ch] text-[1.2rem] leading-[1.45] font-medium tracking-[-0.005em] text-pretty sm:text-[1.35rem]">
            {report.summary}
          </p>
          <p className="mt-5 max-w-[68ch] leading-relaxed text-ink-2">{report.playerProfile}</p>
        </div>
        <ExportPanel analysisId={analysis.id} sourceName={source.name} sourceId={source.id} />
      </div>

      {/* The chorus stays in view while you explore themes, so you can see when each one was said. */}
      <section className="sticky top-0 z-10 -mx-4 mt-12 border-y border-line bg-paper/90 px-4 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
          <p className="text-ink-2">
            {focus ? (
              <>
                <span className="font-medium text-ink">{focus.label}</span>
                <span className="tnum text-ink-3"> · {focus.ids.length} reviews</span>
                <button onClick={() => { setFocus(null); setOpen(null); }} className="ml-3 text-ink-3 underline underline-offset-4">
                  show all
                </button>
              </>
            ) : (
              "Each bar is one sampled review, placed when it was written"
            )}
          </p>
          <p className="flex gap-4 text-ink-3">
            <span><span className="mr-1.5 inline-block size-2 rounded-full bg-pos" />Recommended</span>
            <span><span className="mr-1.5 inline-block size-2 rounded-full bg-neg" />Not recommended</span>
            <span className="hidden sm:inline">height = helpful votes</span>
            {markers.length > 0 && (
              <span className="hidden sm:inline">
                <span className="mr-1.5 inline-block h-3 border-l-2 border-dashed border-tv align-middle" />
                web event
              </span>
            )}
          </p>
        </div>
        <Chorus items={strip} eras={analysis.eras} height={96} highlight={highlight} animate markers={markers} />
      </section>

      {KINDS.map(({ kind, title, blurb, color, soft }) => {
        const themes = report.themes.filter((th) => th.kind === kind);
        if (!themes.length) return null;
        return (
          <section key={kind} id={kind} className="mt-16 scroll-mt-40">
            <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-3xl font-bold tracking-tight" style={{ color }}>
                {title}
              </h2>
              <p className="text-sm text-ink-3">{blurb}</p>
            </header>
            <ul className="border-t border-ink">
              {themes.map((theme) => (
                <ThemeRow
                  key={theme.key}
                  theme={theme}
                  color={color}
                  soft={soft}
                  maxShare={maxShare}
                  open={open === theme.key}
                  onToggle={() => toggle(theme)}
                  byId={byId}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-20 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Why players quit early</h2>
          <p className="mt-3 leading-relaxed text-ink-2">{report.earlyExit.summary}</p>
          <ul className="mt-5 space-y-1">
            {report.earlyExit.reasons.map((r) => (
              <li key={r.title}>
                <button
                  onClick={() => { setOpen(null); setFocus({ label: r.title, ids: r.reviewIds }); }}
                  className="flex w-full items-baseline justify-between gap-4 rounded-md py-1.5 text-left hover:text-neg"
                >
                  <span>{r.title}</span>
                  <span className="tnum text-sm text-ink-3">{r.reviewIds.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">How opinion changed</h2>
          <p className="mt-3 leading-relaxed text-ink-2">{report.evolution}</p>
        </div>
      </section>

      {report.outside && <OutsideSteam outside={report.outside} />}

      <section className="mt-20 rounded-3xl bg-ink px-6 py-10 text-paper sm:px-10 sm:py-12">
        <h2 className="font-display text-3xl font-bold tracking-tight">If you&apos;re making a game like this</h2>
        <ul className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
          {report.takeaways.map((k) => (
            <li key={k.title}>
              <p className="font-display text-lg font-semibold">{k.title}</p>
              <p className="mt-1.5 leading-relaxed opacity-75">{k.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 max-w-[70ch] text-sm leading-relaxed text-ink-3">
        Sample: the {analysis.sample.length} most helpful written reviews, half recommended and half not, spread across{" "}
        {analysis.eras.map((e) => e.label.toLowerCase()).join(", ")}. The sample is balanced on purpose, so theme percentages
        describe the sample, not every review of the game. Generated on {new Date(analysis.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })} with {analysis.model}.
      </p>

      {analysis.usage?.byModel?.length ? <Credits analysis={analysis} /> : null}

      {isExample && (
        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl border border-line bg-sheet p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">This is an example report.</p>
            <p className="mt-1 text-ink-2">Get the same for the games you&apos;re studying, or describe yours and we&apos;ll suggest them.</p>
          </div>
          <a href="/analyze" className="font-display btn-hot shrink-0 rounded-lg px-5 py-3 font-bold uppercase">
            Analyze a game
          </a>
        </section>
      )}
    </main>
  );
}

function ThemeRow({
  theme,
  color,
  soft,
  maxShare,
  open,
  onToggle,
  byId,
}: {
  theme: Theme;
  color: string;
  soft: string;
  maxShare: number;
  open: boolean;
  onToggle: () => void;
  byId: Map<string, Review>;
}) {
  const [showAll, setShowAll] = useState(false);
  const s = theme.stats;
  const width = Math.max(4, (s.share / maxShare) * 100);
  const posWidth = s.positiveShare * 100;

  return (
    <li className="border-b border-line">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-1 items-center gap-x-6 gap-y-2 py-4 text-left sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      >
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="text-lg leading-snug font-semibold tracking-[-0.01em]">{theme.title}</span>
          {theme.severity && theme.severity !== "minor" && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: soft, color }}>
              {SEVERITY[theme.severity]}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {/* Bar length = share of the sample; its split shows how much comes from recommended vs not. */}
          <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line/60" title={`${Math.round(posWidth)}% from recommended reviews`}>
            <span className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full" style={{ width: `${width}%` }}>
              <span className="h-full bg-pos" style={{ width: `${posWidth}%` }} />
              <span className="h-full flex-1 bg-neg" />
            </span>
          </span>
          <span className="tnum w-24 shrink-0 text-right text-sm text-ink-2">
            {s.reviews} <span className="text-ink-3">· {Math.round(s.share * 100)}%</span>
          </span>
        </span>
      </button>

      {open && (
        <div className="grid gap-8 pb-8 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <p className="max-w-[65ch] leading-relaxed text-ink-2">{theme.description}</p>
            <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: soft }}>
              <p className="text-sm font-semibold" style={{ color }}>For your game</p>
              <p className="mt-1 leading-relaxed">{theme.takeaway}</p>
            </div>
            <dl className="tnum mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-3">
              <div><dt className="inline">Median </dt><dd className="inline text-ink-2">{s.medianHours} h played</dd></div>
              <div><dt className="inline">Helpful votes </dt><dd className="inline text-ink-2">{num.format(s.helpfulVotes)}</dd></div>
              <div><dd className="inline text-ink-2">{Math.round(s.positiveShare * 100)}%</dd><dt className="inline"> in recommended reviews</dt></div>
            </dl>
          </div>
          <div className="space-y-4">
            {theme.quotes.map((q) => (
              <blockquote key={q.reviewId + q.text.slice(0, 12)} className="border-l-2 pl-4" style={{ borderColor: q.positive ? "var(--pos)" : "var(--neg)" }}>
                <p className="leading-relaxed">“{q.text}”</p>
                <footer className="tnum mt-1 text-xs text-ink-3">
                  {q.positive ? "Recommended" : "Not recommended"} · {q.hours} h · {num.format(q.helpful)} helpful
                </footer>
              </blockquote>
            ))}
            {theme.reviewIds.length > 0 && (
              <button onClick={() => setShowAll((v) => !v)} className="text-sm text-ink-2 underline decoration-line underline-offset-4">
                {showAll ? "Hide reviews" : `Read all ${theme.reviewIds.length} reviews`}
              </button>
            )}
          </div>
          {showAll && (
            <ol className="space-y-3 sm:col-span-2">
              {theme.reviewIds
                .map((id) => byId.get(id))
                .filter((r): r is Review => !!r)
                .sort((a, b) => b.helpful - a.helpful)
                .map((r) => (
                  <li key={r.reviewId} className="rounded-xl bg-sheet p-4">
                    <p className="tnum mb-1.5 text-xs text-ink-3">
                      <span style={{ color: r.positive ? "var(--pos)" : "var(--neg)" }}>{r.positive ? "Recommended" : "Not recommended"}</span>
                      {" · "}{r.hoursAtReview} h at review · {num.format(r.helpful)} helpful · {monthFmt.format(r.createdAt * 1000)}
                    </p>
                    <p className="max-w-[80ch] text-sm leading-relaxed whitespace-pre-line text-ink-2">{r.text}</p>
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

function toUnix(date: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}/.test(date)) return null;
  const t = Date.parse(date.length === 7 ? `${date}-15` : date);
  return Number.isNaN(t) ? null : t / 1000;
}

const KIND_COLOR: Record<OutsideEvent["kind"], string> = {
  launch: "var(--pos)",
  update: "var(--tv)",
  news: "var(--ink-2)",
  controversy: "var(--neg)",
  sale: "var(--ask)",
};

/** What happened to the game outside its reviews, found by Tavily and dated by Nemotron. */
function OutsideSteam({ outside }: { outside: NonNullable<Analysis["report"]["outside"]> }) {
  return (
    <section className="mt-20">
      <p className="font-pixel text-xs text-tv uppercase">Scouted by Tavily</p>
      <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">Meanwhile, outside Steam</h2>
      <p className="mt-3 max-w-[68ch] leading-relaxed text-ink-2">{outside.summary}</p>
      {outside.events.length > 0 && (
        <ol className="mt-6 border-l-2 border-line pl-5">
          {outside.events.map((e, i) => (
            <li key={i} className="relative pb-4">
              <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-paper" style={{ background: KIND_COLOR[e.kind] }} />
              <p className="text-sm">
                <span className="font-pixel tnum mr-2 text-[11px] text-ink-3">{e.date ?? "undated"}</span>
                <span className="font-pixel mr-2 text-[10px] uppercase" style={{ color: KIND_COLOR[e.kind] }}>
                  {e.kind}
                </span>
                <a href={e.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:decoration-ink-2">
                  {e.title}
                </a>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Which engines built this report: the rail yard's timesheet. */
function Credits({ analysis }: { analysis: Analysis }) {
  const u = analysis.usage!;
  return (
    <section className="hud mt-16 rounded-xl p-5 sm:p-6">
      <p className="font-pixel text-xs text-ink-3 uppercase">Built by</p>
      <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-6">
        {u.byModel!.map((m) => (
          <div key={m.model} className="flex items-end gap-4">
            <SteamEngine label={m.label} running={false} size={110} />
            <div className="pb-6 text-sm">
              <p className="text-ink-2">{m.tasks.join(", ")}</p>
              <p className="tnum text-ink-3">
                {m.calls} {m.calls === 1 ? "call" : "calls"} · {num.format(Math.round((m.inputTokens + m.outputTokens) / 1000))}k tokens
              </p>
            </div>
          </div>
        ))}
        {u.searches ? (
          <p className="pb-6 text-sm">
            <span className="text-tv">Tavily Search</span>
            <span className="tnum text-ink-3"> · {u.searches} web searches</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
