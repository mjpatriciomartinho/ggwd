import { PricingTable } from "@/components/PricingTable";

export const metadata = { title: "Pricing" };

const QUESTIONS = [
  {
    q: "What does one credit get me?",
    a: "One full report on one game: up to 700 of its most helpful reviews read across its whole life, every theme with counts and quotes, design lessons, and the Markdown and JSON exports.",
  },
  {
    q: "Do credits expire?",
    a: "No. They stay in your account until you use them.",
  },
  {
    q: "Are game suggestions free?",
    a: "Yes. Describing your game and getting a list of games to study never uses a credit. Only the reports do.",
  },
  {
    q: "What if a report fails?",
    a: "If a report can't be completed, for example because the game has too few written reviews, the credit goes back to your account.",
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:px-8 sm:pt-20">
      <h1 className="font-display max-w-3xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] font-bold tracking-[-0.035em]">
        Pay per report. No subscription.
      </h1>
      <p className="mt-4 mb-12 max-w-2xl text-lg leading-relaxed text-ink-2">
        One credit is one game. Buy what you need for the project in front of you; the bigger the pack, the less each
        report costs. Prices in US dollars, taxes may apply.
      </p>
      <PricingTable />

      <section className="mt-24 max-w-3xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Billing questions</h2>
        <dl className="mt-6 border-t border-line">
          {QUESTIONS.map((x) => (
            <div key={x.q} className="border-b border-line py-5">
              <dt className="font-semibold">{x.q}</dt>
              <dd className="mt-1.5 leading-relaxed text-ink-2">{x.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
