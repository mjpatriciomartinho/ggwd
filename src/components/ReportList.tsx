import Link from "next/link";
import { Chorus } from "./Chorus";
import type { AnalysisListItem } from "@/lib/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function ReportList({ items, showSummary = false }: { items: AnalysisListItem[]; showSummary?: boolean }) {
  return (
    <ul className="border-t border-line">
      {items.map((a) => {
        const t = a.source.totals;
        const pct = t && t.total ? Math.round((t.positive / t.total) * 100) : null;
        return (
          <li key={a.id} className="border-b border-line">
            <Link
              href={`/report/${a.id}`}
              className="group grid grid-cols-[88px_1fr] items-center gap-x-5 gap-y-3 py-5 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1.3fr)_auto]"
            >
              {a.source.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.source.image} alt="" className="aspect-[460/215] w-full rounded-md object-cover" />
              ) : (
                <div className="aspect-[460/215] rounded-md bg-line" />
              )}
              <div className="min-w-0">
                <p className="font-display truncate text-lg font-semibold tracking-tight group-hover:underline">{a.source.name}</p>
                <p className="truncate text-sm text-ink-3">
                  {a.source.developer ?? "Steam"}
                  {pct != null && <span className="tnum"> · {pct}% positive</span>}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Chorus items={a.strip} height={44} showLabels={false} />
              </div>
              <p className="tnum hidden text-right text-sm text-ink-3 sm:block">
                {a.sampleSize} reviews
                <br />
                {dateFmt.format(a.createdAt)}
              </p>
              {showSummary && <p className="col-span-2 line-clamp-2 text-sm leading-relaxed text-ink-2 sm:col-span-4">{a.summary}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
