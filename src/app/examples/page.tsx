import Link from "next/link";
import { ReportList } from "@/components/ReportList";
import { EXAMPLE_SOURCES } from "@/lib/site";
import { listAnalysesFor } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Example reports" };

export default async function ExamplesPage() {
  const examples = await listAnalysesFor(EXAMPLE_SOURCES);
  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:px-8 sm:pt-20">
      <h1 className="font-display text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] font-bold tracking-[-0.035em]">Example reports</h1>
      <p className="mt-4 mb-10 max-w-2xl text-lg leading-relaxed text-ink-2">
        Full, unedited reports on well-known games, exactly as ggwd produced them. Open one to see the themes, the
        quotes behind them and the timeline of every review sampled.
      </p>
      <ReportList items={examples} showSummary />
      <p className="mt-10 text-ink-2">
        Want one for a game you&apos;re studying?{" "}
        <Link href="/analyze" className="font-medium text-ink underline underline-offset-4">
          Analyze a game
        </Link>
      </p>
    </main>
  );
}
