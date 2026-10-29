import Link from "next/link";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/analyze", label: "Analyze a game" },
      { href: "/examples", label: "Example reports" },
      { href: "/pricing", label: "Pricing" },
      { href: "/ai", label: "For your AI" },
    ],
  },
  {
    title: "Company",
    links: [
      ...(SITE.contactEmail ? [{ href: `mailto:${SITE.contactEmail}`, label: "Contact" }] : []),
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy#cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3"><span className="font-pixel text-[10px] text-hot uppercase">{SITE.fullName}</span>
            <br />
            {SITE.tagline} Player reviews, read for game developers.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-3 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-line px-4 py-6 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {SITE.legalEntity}. All rights reserved.
        </p>
        <p>Not affiliated with Valve Corporation. Steam is a trademark of Valve Corporation.</p>
      </div>
    </footer>
  );
}
