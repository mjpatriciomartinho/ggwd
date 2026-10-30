import Link from "next/link";
import { RadarScout, SteamEngine } from "@/components/Engines";
import { HeroDemo, type DemoTheme } from "@/components/HeroDemo";
import { MODELS } from "@/lib/models";
import { PricingTable } from "@/components/PricingTable";
import { ReportList } from "@/components/ReportList";
import { EXAMPLE_SOURCES, SITE } from "@/lib/site";
import { getAnalysis, getSource, listAnalysesFor } from "@/lib/store";
import type { Theme } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Point it at a game",
    body: "Paste a Steam link, or pitch the game you're making and we'll find the ones whose players can teach you the most.",
  },
  {
    title: "The engines get to work",
    body: "Up to 700 of the most helpful reviews from launch to today. Tavily digs up what happened to the game, Nemotron Lightning reads every review, Nemotron Ultra connects the dots.",
  },
  {
    title: "You get the receipts",
    body: "Themes with real counts, verbatim quotes and design lessons. Read it, share it, or hand it to your AI.",
  },
];

const SECTIONS = [
  { name: "What hooks players", body: "The mechanics, moments and feelings people praise, even inside negative reviews.", color: "var(--pos)" },
  { name: "What makes them ragequit", body: "Every complaint, ranked by how many players share it and how much it was upvoted, flagged when it makes people quit.", color: "var(--neg)" },
  { name: "What they're begging for", body: "Missing features, wished-for modes, the sequel they want.", color: "var(--ask)" },
  { name: "Why they quit early", body: "What players with under three hours were looking for and didn't find.", color: "var(--ink)" },
  { name: "How opinion changed", body: "Launch versus today, lined up with the real updates and dramas Tavily finds on the web.", color: "var(--tv)" },
  { name: "Lessons for your game", body: "Five to eight concrete design takeaways if you're building something in this space.", color: "var(--ink)" },
];

const SUGGESTIONS = [
  { role: "Benchmark", name: "Balatro", why: "What makes combo discovery feel explosive." },
  { role: "Closest", name: "Potionomics", why: "A shop sim with cards: your bakery fantasy." },
  { role: "Cautionary", name: "Cuisineer", why: "Cozy roguelite, mixed reviews: the traps." },
  { role: "Same audience", name: "Spirittea", why: "Serving ghost customers in a cozy village." },
];

const FAQ = [
  {
    q: "Where do the reviews come from?",
    a: "From the public Steam store, the same reviews anyone can read on a game's page. We never log in to Steam and never store reviewers' names or profiles, only the review text, playtime, votes and date.",
  },
  {
    q: "How reliable are the numbers?",
    a: "Every count comes from the reviews themselves: the AI lists which reviews make each point and we do the maths. Quotes are checked word for word against the original review. Because the sample is balanced on purpose, percentages describe the sample, not the whole player base. The store's overall score is shown separately.",
  },
  {
    q: "Which games can I analyze?",
    a: "Any game on Steam with at least a few dozen written reviews in the language you choose. App Store and Google Play are next.",
  },
  {
    q: "Can I analyze my own game?",
    a: "Yes, a report on your own game works exactly the same. Ongoing tracking of your game's new reviews, with alerts and reply drafts, is on the way.",
  },
  {
    q: "What languages are supported?",
    a: "ggwd can read English reviews, Spanish reviews or all languages at once, and write the report in English or Spanish.",
  },
  {
    q: "Do credits expire?",
    a: "No. Buy a pack today and use the reports whenever you start your next project.",
  },
  {
    q: "Is ggwd affiliated with Valve or Steam?",
    a: "No. ggwd is an independent tool that reads publicly available store reviews.",
  },
];

function demoThemes(themes: Theme[]): DemoTheme[] {
  const pick = (kind: Theme["kind"]) => themes.filter((t) => t.kind === kind).slice(0, 3);
  const loves = pick("love");
  const pains = pick("pain");
  const out: Theme[] = [];
  for (let i = 0; i < 3; i++) {
    if (loves[i]) out.push(loves[i]);
    if (pains[i]) out.push(pains[i]);
  }
  return out.map((t) => ({
    key: t.key,
    kind: t.kind,
    title: t.title,
    ids: t.reviewIds,
    share: t.stats.share,
    // Shortest readable quote; all-caps shouting reads badly as a headline example.
    quote:
      [...t.quotes]
        .sort((a, b) => a.text.length - b.text.length)
        .find((q) => q.text.length > 40 && q.text !== q.text.toUpperCase()) ??
      t.quotes[0] ??
      null,
  }));
}

export default async function Home() {
  const examples = await listAnalysesFor(EXAMPLE_SOURCES);
  const demoId = examples[0]?.id;
  const demo = demoId ? await getAnalysis(demoId) : null;
  const demoSource = demo ? await getSource(demo.sourceId) : null;

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-8 sm:pt-24">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <h1 className="font-display text-[clamp(2.8rem,7.5vw,5.8rem)] leading-[0.9] font-bold tracking-[-0.02em] uppercase">
            Steam reviews are <span className="text-neg">brutal</span>. <span className="text-pos">Learn</span> from them.
          </h1>
          <div className="lg:pb-2">
            <p className="font-pixel mb-4 text-xs text-hot uppercase">gg wp? no: {SITE.fullName}</p>
            <p className="max-w-md text-lg leading-relaxed text-ink-2">
              Players write 4,000-word rants so you don&apos;t have to make the same mistakes. ggwd feeds the most helpful
              Steam reviews of any game to NVIDIA Nemotron on Nebius, digs up the backstory with Tavily, and tells you what
              hooks players, what makes them ragequit and what they&apos;re begging for.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/analyze" className="font-display btn-hot rounded-lg px-5 py-3 font-bold uppercase">
                Analyze a game
              </Link>
              <Link href="/examples" className="font-display rounded-lg border border-line px-5 py-3 font-bold uppercase hover:border-ink-3">
                See example reports
              </Link>
            </div>
          </div>
        </div>

        {demo && demoSource && (
          <div className="mt-14">
            <HeroDemo
              analysisId={demo.id}
              name={demoSource.name}
              meta={`${demo.sample.length} reviews from ${demo.eras.length} eras · each bar is one review`}
              eras={demo.eras}
              sample={demo.sample}
              themes={demoThemes(demo.report.themes)}
            />
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto mt-28 max-w-6xl scroll-mt-10 px-4 sm:px-8">
        <h2 className="font-display max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Thousands of reviews. Three engines. Zero reading on your part.
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-ink pt-5">
              <span className="font-display tnum text-sm font-semibold text-ink-3">{i + 1}</span>
              <h3 className="font-display mt-2 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The engines */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <div className="hud rounded-2xl p-6 sm:p-10">
          <p className="font-pixel text-xs text-hot uppercase">Powered by open models</p>
          <h2 className="font-display mt-2 max-w-3xl text-4xl leading-tight font-bold uppercase">
            Full steam ahead: the right engine for every job.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">
            A router picks the model per task and you watch it happen: every call shows up live with the model&apos;s
            name on the locomotive and the reason it was picked.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <RadarScout running label="Tavily" size={80} />
              <p className="mt-3 text-sm text-ink-2">Scouts the web for patches, launches and dramas.</p>
            </div>
            {(["nano", "super", "ultra"] as const).map((t) => (
              <div key={t} className="flex flex-col items-center text-center">
                <SteamEngine label={MODELS[t].label} running size={130} />
                <p className="mt-3 text-sm text-ink-2">
                  {t === "nano" ? "Reads every single review, in parallel." : t === "super" ? "Picks the games worth studying, fast." : "Weighs hundreds of notes and writes the report."}
                </p>
              </div>
            ))}
          </div>
          <Link href="/engine" className="mt-8 inline-block text-ink-2 underline decoration-line underline-offset-4 hover:decoration-ink-2">
            Visit the engine room
          </Link>
        </div>
      </section>

      {/* What's in a report */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight font-bold tracking-tight">Everything a design review should tell you.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-2">
              Specific to the game, never generic. Not “players enjoy the gameplay”, but which system, which moment, after
              how many hours, and how many players agree.
            </p>
          </div>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <div key={s.name}>
                <dt className="font-display text-lg font-semibold tracking-tight" style={{ color: s.color }}>
                  {s.name}
                </dt>
                <dd className="mt-1.5 leading-relaxed text-ink-2">{s.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Describe your game */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <div className="grid gap-10 rounded-3xl bg-sheet p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight font-bold tracking-tight">Not sure which games to study?</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-2">
              Describe the game you&apos;re making. ggwd suggests the benchmarks players will compare it to, the closest
              matches, the games that share your audience, and the ones that disappointed players, because their
              negative reviews show you the traps. Suggestions are free.
            </p>
            <Link href="/analyze?mode=describe" className="font-display btn-hot mt-6 inline-block rounded-lg px-5 py-3 font-bold uppercase">
              Describe your game
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-sm leading-relaxed text-ink-2">
              “A cozy roguelite deckbuilder where you run a bakery in a haunted village. Draw recipe cards, combine
              ingredients, serve ghost customers before nightfall…”
            </p>
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {SUGGESTIONS.map((s) => (
                <li key={s.name} className="grid grid-cols-[110px_1fr] gap-3 py-3 text-sm">
                  <span className="text-ink-3">{s.role}</span>
                  <span>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-ink-2"> · {s.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* For your AI */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight font-bold tracking-tight">Made to be read by your AI, too.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-2">
              Every report exports as clean Markdown with counts and quotes, ready to paste next to your design doc. Or
              connect ggwd to Claude Code, Cursor or any MCP client and ask about player feedback without leaving your
              project.
            </p>
            <Link href="/ai" className="mt-5 inline-block text-ink-2 underline decoration-line underline-offset-4 hover:decoration-ink-2">
              How to connect your AI
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-ink text-paper">
            <div className="border-b border-paper/10 px-5 py-3 text-xs opacity-60">your-game / claude code</div>
            <div className="space-y-4 p-5 font-mono text-[13px] leading-relaxed">
              <p>
                <span className="opacity-50">&gt; </span>Use ggwd to compare our GDD with what frustrates Balatro players.
                Which of those traps are we walking into?
              </p>
              <p className="opacity-70">
                ggwd · get_report(&quot;Balatro&quot;)
                <br />
                ggwd · search_reviews(&quot;boss blind&quot;, negative, 50h+)
              </p>
              <p>
                Three risks stand out. Your shop has two slots and paid rerolls, the exact setup 12% of the sample blames
                for runs feeling decided by luck…
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Examples */}
      {examples.length > 0 && (
        <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-4xl font-bold tracking-tight">Read a real report.</h2>
            <Link href="/examples" className="text-ink-2 underline decoration-line underline-offset-4 hover:decoration-ink-2">
              All examples
            </Link>
          </div>
          <ReportList items={examples} showSummary />
        </section>
      )}

      {/* Pricing */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <h2 className="font-display text-4xl font-bold tracking-tight">Pay per report. No subscription.</h2>
        <p className="mt-3 mb-10 max-w-xl leading-relaxed text-ink-2">
          One credit, one game. Packs bring the price per report down, and credits never expire.
        </p>
        <PricingTable />
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto mt-28 max-w-3xl scroll-mt-10 px-4 sm:px-8">
        <h2 className="font-display text-4xl font-bold tracking-tight">Questions</h2>
        <div className="mt-8 border-t border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold tracking-[-0.01em]">
                {f.q}
                <span className="text-ink-3 transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="max-w-[68ch] pb-6 leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-8">
        <div className="rounded-3xl bg-ink px-6 py-14 text-center text-paper sm:py-20">
          <h2 className="font-display mx-auto max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Your players are already roasting you. {SITE.name} takes notes.
          </h2>
          <Link href="/analyze" className="font-display btn-hot mt-8 inline-block rounded-lg px-6 py-3.5 font-bold uppercase">
            Analyze a game
          </Link>
        </div>
      </section>
    </main>
  );
}
