// Brand, pricing and example reports in one place, so renaming the product or changing a price is a
// one-file edit. Nothing here is charged yet: payments come later.

export const SITE = {
  name: "ggwd",
  fullName: "good game, well developed",
  tagline: "Steam reviews are brutal. Learn from them.",
  description:
    "ggwd feeds the most helpful Steam reviews of any game to NVIDIA Nemotron on Nebius, digs up what happened to the game with Tavily, and tells you what hooks players, what makes them ragequit and what they're begging for.",
  contactEmail: "", // not set yet: the footer hides "Contact" and legal pages say so until there is one
  legalEntity: "MJ",
  jurisdiction: "Spain",
  lastLegalUpdate: "October 25, 2026",
};

export interface Plan {
  id: string;
  name: string;
  reports: number;
  price: number; // USD
  blurb: string;
  featured?: boolean;
}

// Single and 3-pack are priced close together on purpose, so the 10-pack is the obvious choice.
export const PLANS: Plan[] = [
  { id: "single", name: "Single", reports: 1, price: 19, blurb: "One game, one report." },
  { id: "trio", name: "Trio", reports: 3, price: 49, blurb: "Your closest competitors." },
  { id: "studio", name: "Studio", reports: 10, price: 99, blurb: "Map a whole genre before you commit.", featured: true },
  { id: "publisher", name: "Publisher", reports: 30, price: 219, blurb: "For teams pitching and scouting often." },
];

export const perReport = (p: Plan) => p.price / p.reports;
export const savings = (p: Plan) => Math.round((1 - perReport(p) / perReport(PLANS[0])) * 100);

/** Source ids whose latest analysis is shown as a public example. */
export const EXAMPLE_SOURCES = ["steam-1794680", "steam-2379780"];

export const NAV = [
  { href: "/examples", label: "Examples" },
  { href: "/engine", label: "Engine room" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ai", label: "For your AI" },
];
