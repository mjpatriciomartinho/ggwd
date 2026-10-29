import { AnalyzeApp } from "@/components/AnalyzeApp";
import { ReportList } from "@/components/ReportList";
import { listAnalyses } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analyze a game" };

export default async function AnalyzePage({ searchParams }: PageProps<"/analyze">) {
  const { mode } = await searchParams;
  const analyses = await listAnalyses();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-8 sm:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] font-bold uppercase">Analyze a game</h1>
        <p className="rounded-full bg-ask-soft px-3 py-1 text-sm text-ask">Free during the preview</p>
      </div>
      <p className="mt-4 mb-8 max-w-2xl text-lg leading-relaxed text-ink-2">
        Paste a Steam link to get a report on that game, or describe yours and pick from the games worth studying.
        Each report uses one credit.
      </p>

      <AnalyzeApp initialMode={mode === "describe" ? "describe" : "link"} />

      <section className="mt-20">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Your reports</h2>
          <span className="tnum text-sm text-ink-3">{analyses.length}</span>
        </div>
        {analyses.length ? (
          <ReportList items={analyses} />
        ) : (
          <p className="border-t border-line py-10 text-ink-3">Your reports will appear here once the first one is ready.</p>
        )}
      </section>
    </main>
  );
}
