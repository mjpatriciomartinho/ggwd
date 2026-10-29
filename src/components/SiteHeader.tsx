import Link from "next/link";
import { EngineHUD } from "./EngineHUD";
import { Logo } from "./Logo";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 pt-5 sm:px-8">
      <div className="flex items-center gap-5">
        <Logo />
        <EngineHUD />
      </div>
      <nav aria-label="Main" className="flex items-center gap-1 text-sm">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hidden rounded-lg px-3 py-2 text-ink-2 hover:text-ink md:block">
            {item.label}
          </Link>
        ))}
        <Link href="/pricing" className="rounded-lg px-3 py-2 text-ink-2 hover:text-ink md:hidden">
          Pricing
        </Link>
        <Link href="/analyze" className="font-display btn-hot ml-2 rounded-lg px-4 py-2 font-bold uppercase">
          Analyze a game
        </Link>
      </nav>
    </header>
  );
}
