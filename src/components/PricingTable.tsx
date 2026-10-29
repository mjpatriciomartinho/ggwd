import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, perReport, savings } from "@/lib/site";

const INCLUDED = [
  "Up to 700 reviews read per game",
  "Launch, mid-life and last-12-months sample",
  "Themes with counts, quotes and design lessons",
  "Markdown and JSON export, MCP access",
  "Free game suggestions from your description",
];

const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function PricingTable() {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-2xl p-6 ${plan.featured ? "bg-ink text-paper md:-my-3 md:py-9" : "border border-line bg-sheet"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              {plan.featured && <span className="rounded-full bg-paper/15 px-2.5 py-0.5 text-xs font-medium">Best value</span>}
            </div>
            <p className={`mt-1 text-sm ${plan.featured ? "opacity-70" : "text-ink-3"}`}>{plan.blurb}</p>
            <p className="font-display tnum mt-6 text-5xl font-bold tracking-tight">{usd(plan.price)}</p>
            <p className={`tnum mt-1 text-sm ${plan.featured ? "opacity-80" : "text-ink-2"}`}>
              {plan.reports} {plan.reports === 1 ? "report" : "reports"}
              {plan.reports > 1 && (
                <>
                  {" "}· {usd(Math.round(perReport(plan) * 100) / 100)} each
                </>
              )}
            </p>
            <p className={`mt-1 h-5 text-sm font-medium ${plan.featured ? "text-[var(--ask)]" : "text-pos"}`}>
              {savings(plan) > 0 ? `Save ${savings(plan)}%` : ""}
            </p>
            <Link
              href="/analyze"
              className={`font-display mt-6 rounded-xl px-4 py-3 text-center font-semibold ${plan.featured ? "bg-paper text-ink" : "border border-line text-ink hover:border-ink-3"}`}
            >
              {plan.reports === 1 ? "Buy one report" : `Get ${plan.reports} reports`}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-x-8 gap-y-3 text-sm text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
        {INCLUDED.map((item) => (
          <p key={item} className="flex gap-2.5">
            <Check size={17} className="mt-0.5 shrink-0 text-pos" aria-hidden />
            {item}
          </p>
        ))}
        <p className="flex gap-2.5">
          <Check size={17} className="mt-0.5 shrink-0 text-pos" aria-hidden />
          Credits never expire
        </p>
      </div>
    </div>
  );
}
